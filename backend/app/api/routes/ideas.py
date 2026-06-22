from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import Idea, SavedIdea, Upvote
from app.schemas.idea import IdeaCreate, IdeaListResponse, IdeaOut

router = APIRouter(prefix="/ideas", tags=["ideas"])


async def _serialize(db: DbSession, idea: Idea, viewer_id: int) -> IdeaOut:
    upvote_count = await db.scalar(
        select(func.count()).select_from(Upvote).where(Upvote.idea_id == idea.id)
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
) -> IdeaListResponse:
    stmt = select(Idea).options(selectinload(Idea.author))

    if category:
        stmt = stmt.where(Idea.category == category)

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
    if existing:
        await db.execute(delete(Upvote).where(Upvote.id == existing.id))
    else:
        db.add(Upvote(idea_id=idea_id, user_id=current_user.id))
    await db.commit()
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
