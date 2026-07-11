from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import (
    CollaborationRequest,
    Comment,
    Idea,
    Notification,
    SavedIdea,
    Upvote,
)
from app.schemas.idea import (
    CommentCreate,
    CommentOut,
    IdeaCreate,
    IdeaListResponse,
    IdeaOut,
)
from app.realtime import push_notification
from app.schemas.social import CollaborationRequestOut

router = APIRouter(prefix="/ideas", tags=["ideas"])


async def _serialize(db: DbSession, idea: Idea, viewer_id: int) -> IdeaOut:
    upvote_count = await db.scalar(
        select(func.count()).select_from(Upvote).where(Upvote.idea_id == idea.id)
    )
    comment_count = await db.scalar(
        select(func.count()).select_from(Comment).where(Comment.idea_id == idea.id)
    )
    upvoted = await db.scalar(
        select(func.count())
        .select_from(Upvote)
        .where(Upvote.idea_id == idea.id, Upvote.user_id == viewer_id)
    )
    saved = await db.scalar(
        select(func.count())
        .select_from(SavedIdea)
        .where(SavedIdea.idea_id == idea.id, SavedIdea.user_id == viewer_id)
    )
    out = IdeaOut.model_validate(idea)
    out.upvote_count = upvote_count or 0
    out.comment_count = comment_count or 0
    out.upvoted_by_me = bool(upvoted)
    out.saved_by_me = bool(saved)
    return out


@router.get("", response_model=IdeaListResponse)
async def list_ideas(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: str | None = None,
    sort: str = Query("recent", pattern="^(recent|top)$"),
    saved: bool = False,
    author_id: int | None = None,
) -> IdeaListResponse:
    stmt = select(Idea).options(selectinload(Idea.author))

    if category:
        stmt = stmt.where(Idea.category == category)

    if author_id is not None:
        stmt = stmt.where(Idea.author_id == author_id)

    if saved:
        stmt = stmt.join(SavedIdea, SavedIdea.idea_id == Idea.id).where(
            SavedIdea.user_id == current_user.id
        )

    if sort == "top":
        upvote_sq = (
            select(Upvote.idea_id, func.count().label("c"))
            .group_by(Upvote.idea_id)
            .subquery()
        )
        stmt = stmt.outerjoin(upvote_sq, upvote_sq.c.idea_id == Idea.id).order_by(
            func.coalesce(upvote_sq.c.c, 0).desc(), Idea.created_at.desc()
        )
    else:
        stmt = stmt.order_by(Idea.created_at.desc())

    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    )

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    ideas = (await db.scalars(stmt)).all()

    items = [await _serialize(db, idea, current_user.id) for idea in ideas]
    return IdeaListResponse(
        items=items, total=total or 0, page=page, page_size=page_size
    )


@router.post("", response_model=IdeaOut, status_code=status.HTTP_201_CREATED)
async def create_idea(
    payload: IdeaCreate, db: DbSession, current_user: CurrentUser
) -> IdeaOut:
    idea = Idea(
        title=payload.title,
        body=payload.body,
        category=payload.category,
        visibility=payload.visibility,
        author_id=current_user.id,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea, attribute_names=["author"])
    return await _serialize(db, idea, current_user.id)


async def _get_idea_or_404(db: DbSession, idea_id: int) -> Idea:
    idea = await db.scalar(
        select(Idea).options(selectinload(Idea.author)).where(Idea.id == idea_id)
    )
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    return idea


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> None:
    idea = await _get_idea_or_404(db, idea_id)
    if idea.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own ideas",
        )
    # Related upvotes/saves/comments/notifications/collab requests cascade via FKs.
    await db.delete(idea)
    await db.commit()


def _notify(
    db: DbSession,
    *,
    user_id: int,
    actor_id: int,
    type: str,
    text: str,
    idea_id: int | None = None,
) -> Notification | None:
    """Queue a notification (skips self-notifications). Caller commits.

    Returns the queued Notification so the caller can broadcast it after commit.
    """
    if user_id == actor_id:
        return None
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        text=text,
        idea_id=idea_id,
    )
    db.add(notif)
    return notif


@router.post("/{idea_id}/upvote", response_model=IdeaOut)
async def toggle_upvote(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> IdeaOut:
    idea = await _get_idea_or_404(db, idea_id)
    existing = await db.scalar(
        select(Upvote).where(
            Upvote.idea_id == idea_id, Upvote.user_id == current_user.id
        )
    )
    notif = None
    if existing:
        await db.execute(delete(Upvote).where(Upvote.id == existing.id))
    else:
        db.add(Upvote(idea_id=idea_id, user_id=current_user.id))
        notif = _notify(
            db,
            user_id=idea.author_id,
            actor_id=current_user.id,
            type="upvote",
            text=f'upvoted your idea "{idea.title}"',
            idea_id=idea.id,
        )
    await db.commit()
    if notif is not None:
        await db.refresh(notif)
        await push_notification(idea.author_id, notif, current_user)
    return await _serialize(db, idea, current_user.id)


@router.post("/{idea_id}/save", response_model=IdeaOut)
async def toggle_save(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> IdeaOut:
    idea = await _get_idea_or_404(db, idea_id)
    existing = await db.scalar(
        select(SavedIdea).where(
            SavedIdea.idea_id == idea_id, SavedIdea.user_id == current_user.id
        )
    )
    if existing:
        await db.execute(delete(SavedIdea).where(SavedIdea.id == existing.id))
    else:
        db.add(SavedIdea(idea_id=idea_id, user_id=current_user.id))
    await db.commit()
    return await _serialize(db, idea, current_user.id)


@router.get("/{idea_id}/comments", response_model=list[CommentOut])
async def list_comments(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> list[Comment]:
    await _get_idea_or_404(db, idea_id)
    comments = (
        await db.scalars(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.idea_id == idea_id)
            .order_by(Comment.created_at.asc())
        )
    ).all()
    return list(comments)


@router.post(
    "/{idea_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    idea_id: int, payload: CommentCreate, db: DbSession, current_user: CurrentUser
) -> Comment:
    idea = await _get_idea_or_404(db, idea_id)
    comment = Comment(
        body=payload.body, idea_id=idea_id, author_id=current_user.id
    )
    db.add(comment)
    notif = _notify(
        db,
        user_id=idea.author_id,
        actor_id=current_user.id,
        type="comment",
        text=f'commented on your idea "{idea.title}"',
        idea_id=idea.id,
    )
    await db.commit()
    await db.refresh(comment, attribute_names=["author"])
    if notif is not None:
        await db.refresh(notif)
        await push_notification(idea.author_id, notif, current_user)
    return comment


@router.post(
    "/{idea_id}/interest",
    response_model=CollaborationRequestOut,
    status_code=status.HTTP_201_CREATED,
)
async def express_interest(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> CollaborationRequest:
    idea = await _get_idea_or_404(db, idea_id)
    if idea.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot express interest in your own idea",
        )

    existing = await db.scalar(
        select(CollaborationRequest).where(
            CollaborationRequest.from_user_id == current_user.id,
            CollaborationRequest.idea_id == idea_id,
            CollaborationRequest.status == "pending",
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already expressed interest in this idea",
        )

    req = CollaborationRequest(
        from_user_id=current_user.id,
        to_user_id=idea.author_id,
        idea_id=idea_id,
    )
    db.add(req)
    notif = _notify(
        db,
        user_id=idea.author_id,
        actor_id=current_user.id,
        type="collab",
        text=f'expressed interest in your idea "{idea.title}"',
        idea_id=idea.id,
    )
    await db.commit()
    await db.refresh(req, attribute_names=["from_user", "to_user"])
    if notif is not None:
        await db.refresh(notif)
        await push_notification(idea.author_id, notif, current_user)
    return req
