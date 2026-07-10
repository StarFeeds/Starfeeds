from fastapi import APIRouter, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.api.routes.ideas import _serialize
from app.models import Idea, User
from app.schemas.search import SearchResults
from app.schemas.user import UserPublic

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResults)
async def search(
    db: DbSession,
    current_user: CurrentUser,
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(8, ge=1, le=20),
) -> SearchResults:
    term = f"%{q.strip()}%"

    ideas = (
        await db.scalars(
            select(Idea)
            .options(selectinload(Idea.author))
            .where(
                or_(
                    Idea.title.ilike(term),
                    Idea.body.ilike(term),
                    Idea.category.ilike(term),
                )
            )
            .order_by(Idea.created_at.desc())
            .limit(limit)
        )
    ).all()

    users = (
        await db.scalars(
            select(User)
            .where(
                or_(
                    User.full_name.ilike(term),
                    User.username.ilike(term),
                    User.headline.ilike(term),
                )
            )
            .order_by(User.full_name.asc())
            .limit(limit)
        )
    ).all()

    return SearchResults(
        ideas=[await _serialize(db, idea, current_user.id) for idea in ideas],
        users=[UserPublic.model_validate(u) for u in users],
    )
