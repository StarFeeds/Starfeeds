from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import selectinload

from app.announcement_email import send_announcement_emails
from app.featured import featured_idea_id, set_featured
from app.nudges import catch_up_audience, inactive_condition, send_catch_up
from app.api.deps import AdminUser, DbSession
from app.core.config import settings
from app.realtime import manager, push_notification
from app.models import (
    CollaborationRequest,
    Comment,
    Conversation,
    GroupMessage,
    Idea,
    Message,
    Notification,
    Upvote,
    User,
)
from app.schemas.admin import (
    AdminIdeaListResponse,
    AdminIdeaOut,
    AdminIdeaUpdate,
    AdminStats,
    AdminUserListResponse,
    AdminUserOut,
    AdminUserUpdate,
    AnnouncementCreate,
    DailyCount,
    OnlineUser,
    TeamFunnel,
    TopIdea,
)

router = APIRouter(prefix="/admin", tags=["admin"])


async def _count(db: DbSession, model, *where) -> int:
    stmt = select(func.count()).select_from(model)
    if where:
        stmt = stmt.where(*where)
    return (await db.scalar(stmt)) or 0


@router.get("/stats", response_model=AdminStats)
async def stats(db: DbSession, admin: AdminUser) -> AdminStats:
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_7d = start_today - timedelta(days=6)
    start_30d = start_today - timedelta(days=29)

    # Top ideas by upvotes
    upvote_sq = (
        select(Upvote.idea_id, func.count().label("c"))
        .group_by(Upvote.idea_id)
        .subquery()
    )
    top_rows = (
        await db.execute(
            select(Idea.id, Idea.title, func.coalesce(upvote_sq.c.c, 0).label("u"))
            .outerjoin(upvote_sq, upvote_sq.c.idea_id == Idea.id)
            .order_by(desc("u"), Idea.created_at.desc())
            .limit(5)
        )
    ).all()

    # Signups over the last 7 days, bucketed in Python (DB-agnostic).
    buckets: dict[str, int] = {
        (start_7d + timedelta(days=i)).date().isoformat(): 0 for i in range(7)
    }
    recent = (await db.scalars(select(User.created_at).where(User.created_at >= start_7d))).all()
    for ts in recent:
        key = ts.astimezone(timezone.utc).date().isoformat() if ts.tzinfo else ts.date().isoformat()
        if key in buckets:
            buckets[key] += 1

    online = (
        await db.execute(
            select(User.id, User.username, User.full_name)
            .where(User.is_online.is_(True))
            .order_by(User.last_seen_at.desc())
            .limit(20)
        )
    ).all()

    return AdminStats(
        online_now=await _count(db, User, User.is_online.is_(True)),
        online_users=[OnlineUser(id=r[0], username=r[1], full_name=r[2]) for r in online],
        # Online now counts as active even if their session started earlier.
        active_today=await _count(db, User, or_(User.is_online.is_(True), User.last_seen_at >= start_today)),
        active_7d=await _count(db, User, or_(User.is_online.is_(True), User.last_seen_at >= start_7d)),
        users_total=await _count(db, User),
        users_active=await _count(db, User, User.is_active.is_(True)),
        users_admin=await _count(db, User, User.is_admin.is_(True)),
        ideas_total=await _count(db, Idea),
        ideas_hidden=await _count(db, Idea, Idea.hidden.is_(True)),
        comments_total=await _count(db, Comment),
        collab_pending=await _count(db, CollaborationRequest, CollaborationRequest.status == "pending"),
        conversations_total=await _count(db, Conversation),
        messages_total=await _count(db, Message),
        signups_today=await _count(db, User, User.created_at >= start_today),
        signups_7d=await _count(db, User, User.created_at >= start_7d),
        signups_30d=await _count(db, User, User.created_at >= start_30d),
        signups_by_day=[DailyCount(date=k, count=v) for k, v in buckets.items()],
        top_ideas=[TopIdea(id=r[0], title=r[1], upvotes=r[2]) for r in top_rows],
    )


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    db: DbSession,
    admin: AdminUser,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AdminUserListResponse:
    idea_counts = (
        select(Idea.author_id, func.count().label("c")).group_by(Idea.author_id).subquery()
    )
    base = select(User, func.coalesce(idea_counts.c.c, 0)).outerjoin(
        idea_counts, idea_counts.c.author_id == User.id
    )
    if q:
        term = f"%{q.strip()}%"
        base = base.where(
            or_(User.email.ilike(term), User.username.ilike(term), User.full_name.ilike(term))
        )

    total = await db.scalar(
        select(func.count()).select_from(base.order_by(None).subquery())
    )
    rows = (
        await db.execute(
            base.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items = []
    for user, count in rows:
        out = AdminUserOut.model_validate(user)
        out.idea_count = count
        items.append(out)
    return AdminUserListResponse(items=items, total=total or 0, page=page, page_size=page_size)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: int, payload: AdminUserUpdate, db: DbSession, admin: AdminUser
) -> AdminUserOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend yourself")
    if user.id == admin.id and payload.is_admin is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin access")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    out = AdminUserOut.model_validate(user)
    out.idea_count = await _count(db, Idea, Idea.author_id == user.id)
    return out


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DbSession, admin: AdminUser) -> None:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account here")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.delete(user)
    await db.commit()


# --------------------------------------------------------------------------- #
# Ideas (moderation)
# --------------------------------------------------------------------------- #
async def _idea_out(db: DbSession, idea: Idea) -> AdminIdeaOut:
    out = AdminIdeaOut.model_validate(idea)
    out.upvote_count = await _count(db, Upvote, Upvote.idea_id == idea.id)
    out.comment_count = await _count(db, Comment, Comment.idea_id == idea.id)
    return out


@router.get("/ideas", response_model=AdminIdeaListResponse)
async def list_ideas(
    db: DbSession,
    admin: AdminUser,
    q: str | None = None,
    hidden: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AdminIdeaListResponse:
    stmt = select(Idea).options(selectinload(Idea.author))
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(Idea.title.ilike(term), Idea.body.ilike(term), Idea.category.ilike(term)))
    if hidden is not None:
        stmt = stmt.where(Idea.hidden.is_(hidden))

    total = await db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ideas = (
        await db.scalars(
            stmt.order_by(Idea.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    items = [await _idea_out(db, i) for i in ideas]
    return AdminIdeaListResponse(items=items, total=total or 0, page=page, page_size=page_size)


@router.patch("/ideas/{idea_id}", response_model=AdminIdeaOut)
async def set_idea_hidden(
    idea_id: int, payload: AdminIdeaUpdate, db: DbSession, admin: AdminUser
) -> AdminIdeaOut:
    idea = await db.scalar(select(Idea).options(selectinload(Idea.author)).where(Idea.id == idea_id))
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    idea.hidden = payload.hidden
    await db.commit()
    await db.refresh(idea, attribute_names=["author"])
    return await _idea_out(db, idea)


@router.delete("/ideas/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(idea_id: int, db: DbSession, admin: AdminUser) -> None:
    idea = await db.get(Idea, idea_id)
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    await db.delete(idea)
    await db.commit()


def _utc(ts: datetime) -> datetime:
    """Treat naive timestamps (SQLite) as UTC so comparisons work everywhere."""
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


@router.get("/funnel", response_model=TeamFunnel)
async def funnel(db: DbSession, admin: AdminUser, days: int = Query(30, ge=7, le=365)) -> TeamFunnel:
    """Sign-up -> activation -> join request -> accepted -> active team.
    Computed in Python over the window (fine at current scale, DB-agnostic)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    new_users = set((await db.scalars(select(User.id).where(User.created_at >= start))).all())
    posters = set((await db.scalars(select(Idea.author_id).where(Idea.author_id.in_(new_users)))).all()) if new_users else set()
    requesters = (
        set((await db.scalars(select(CollaborationRequest.from_user_id).where(CollaborationRequest.from_user_id.in_(new_users)))).all())
        if new_users
        else set()
    )

    reqs = (
        await db.execute(
            select(
                CollaborationRequest.idea_id,
                CollaborationRequest.from_user_id,
                CollaborationRequest.to_user_id,
                CollaborationRequest.status,
                CollaborationRequest.created_at,
                CollaborationRequest.updated_at,
            ).where(CollaborationRequest.created_at >= start)
        )
    ).all()
    responded = [r for r in reqs if r.status != "pending"]
    hours = sorted((_utc(r.updated_at) - _utc(r.created_at)).total_seconds() / 3600 for r in responded)
    median = round(hours[len(hours) // 2], 1) if hours else None
    accepted = [r for r in reqs if r.status == "accepted"]

    # Who posted in which project group, and when (for "active team").
    posts: dict[tuple[int, int], list[datetime]] = {}
    if accepted:
        for idea_id, sender_id, at in (
            await db.execute(
                select(GroupMessage.idea_id, GroupMessage.sender_id, GroupMessage.created_at).where(
                    GroupMessage.idea_id.in_({r.idea_id for r in accepted}), GroupMessage.created_at >= start
                )
            )
        ).all():
            posts.setdefault((idea_id, sender_id), []).append(_utc(at))

    def spoke_after(idea_id: int, user_id: int, since: datetime) -> bool:
        return any(t >= since for t in posts.get((idea_id, user_id), []))

    teams_active = sum(
        1
        for r in accepted
        if spoke_after(r.idea_id, r.from_user_id, _utc(r.updated_at)) and spoke_after(r.idea_id, r.to_user_id, _utc(r.updated_at))
    )

    # Accepted requests per week over the last 8 weeks (by acceptance time).
    week0 = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(weeks=7)
    weekly = {(week0 + timedelta(weeks=i)).date().isoformat(): 0 for i in range(8)}
    for (at,) in (
        await db.execute(
            select(CollaborationRequest.updated_at).where(
                CollaborationRequest.status == "accepted", CollaborationRequest.updated_at >= week0
            )
        )
    ).all():
        key = (week0 + timedelta(weeks=(_utc(at) - week0).days // 7)).date().isoformat()
        if key in weekly:
            weekly[key] += 1

    return TeamFunnel(
        days=days,
        signups=len(new_users),
        posted=len(posters),
        requested=len(requesters),
        activated=len(posters | requesters),
        requests=len(reqs),
        accepted=len(accepted),
        declined=sum(r.status == "declined" for r in reqs),
        pending=sum(r.status == "pending" for r in reqs),
        pending_over_48h=sum(r.status == "pending" and _utc(r.created_at) < now - timedelta(hours=48) for r in reqs),
        median_response_hours=median,
        teams_active=teams_active,
        nudged=await _count(db, User, User.last_nudge_at >= start),
        nudged_came_back=await _count(db, User, User.last_nudge_at >= start, User.last_seen_at > User.last_nudge_at),
        nudged_acted=await _count(db, User, User.last_nudge_at >= start, ~inactive_condition()),
        teams_by_week=[DailyCount(date=k, count=v) for k, v in weekly.items()],
    )


@router.get("/featured")
async def get_featured(db: DbSession, admin: AdminUser) -> dict:
    """Today's Idea of the day (auto-picked if you haven't chosen one)."""
    return {"idea_id": await featured_idea_id(db)}


@router.post("/featured/{idea_id}")
async def feature_idea(idea_id: int, db: DbSession, admin: AdminUser) -> dict:
    """Make this post today's Idea of the day."""
    idea = await db.get(Idea, idea_id)
    if idea is None or idea.hidden or idea.visibility != "public":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only public, visible posts can be featured")
    await set_featured(db, idea_id)
    return {"idea_id": idea_id}


@router.get("/nudges/catch-up")
async def catch_up_preview(db: DbSession, admin: AdminUser) -> dict:
    """How many inactive members the one-off catch-up email would reach."""
    return {"eligible": len(await catch_up_audience(db)), "email_enabled": settings.email_enabled}


@router.post("/nudges/catch-up", status_code=status.HTTP_202_ACCEPTED)
async def catch_up_send(db: DbSession, admin: AdminUser, background_tasks: BackgroundTasks) -> dict:
    """Email every inactive member who hasn't been nudged yet (once each)."""
    if not settings.email_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Email isn't configured")
    n = len(await catch_up_audience(db))
    if n:
        background_tasks.add_task(send_catch_up)
    return {"queued": n}


# --------------------------------------------------------------------------- #
# Announcements — broadcast a system notification to every user
# --------------------------------------------------------------------------- #
async def _announcement_recipients(db: DbSession) -> list[int]:
    """Active users with "General Announcements" on (the default)."""
    rows = (
        await db.execute(select(User.id, User.notification_prefs).where(User.is_active.is_(True)))
    ).all()
    return [uid for uid, prefs in rows if (prefs or {}).get("announcements", True)]


@router.get("/announcements/audience")
async def announcement_audience(db: DbSession, admin: AdminUser) -> dict:
    """How many people a broadcast would reach, shown before sending."""
    n = len(await _announcement_recipients(db))
    return {"in_app": n, "email": n if settings.email_enabled else 0}


@router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def broadcast(
    payload: AnnouncementCreate, db: DbSession, admin: AdminUser, background_tasks: BackgroundTasks
) -> dict:
    recipient_ids = await _announcement_recipients(db)
    notifs = [
        Notification(user_id=uid, actor_id=None, type="system", text=payload.text)
        for uid in recipient_ids
    ]
    db.add_all(notifs)
    await db.commit()

    # Live delivery to everyone who has LikeMinds open right now.
    for n in notifs:
        if manager.is_connected(n.user_id):
            await db.refresh(n)
            await push_notification(n.user_id, n, None)

    emailing = 0
    if payload.email and settings.email_enabled and recipient_ids:
        background_tasks.add_task(send_announcement_emails, recipient_ids, payload.text)
        emailing = len(recipient_ids)
    return {"delivered": len(recipient_ids), "emailing": emailing}
