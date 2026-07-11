from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DbSession
from app.models import (
    CollaborationRequest,
    Comment,
    Conversation,
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

    return AdminStats(
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


# --------------------------------------------------------------------------- #
# Announcements — broadcast a system notification to every user
# --------------------------------------------------------------------------- #
@router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def broadcast(payload: AnnouncementCreate, db: DbSession, admin: AdminUser) -> dict:
    user_ids = (await db.scalars(select(User.id))).all()
    db.add_all(
        [
            Notification(user_id=uid, actor_id=None, type="system", text=payload.text)
            for uid in user_ids
        ]
    )
    await db.commit()
    return {"delivered": len(user_ids)}
