"""'Idea of the day': one post pinned at the top of the feed, per Lagos day.

An admin can pick it; otherwise the first request of the day picks the most
upvoted recent public post that's still recruiting and hasn't been featured
in the last month, and stores it so everyone sees the same one.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import FeaturedIdea, Idea, Upvote

LAGOS = timezone(timedelta(hours=1))  # WAT, no daylight saving
RECENT = timedelta(days=30)
NO_REPEAT = timedelta(days=30)


def lagos_today() -> date:
    return datetime.now(LAGOS).date()


def _eligible(query):
    return query.where(Idea.visibility == "public", Idea.hidden.is_(False))


async def _auto_pick(db, today: date) -> int | None:
    recently_featured = select(FeaturedIdea.idea_id).where(FeaturedIdea.day >= today - NO_REPEAT)
    votes = func.count(Upvote.id)
    base = (
        _eligible(select(Idea.id))
        .outerjoin(Upvote, Upvote.idea_id == Idea.id)
        .where(Idea.id.not_in(recently_featured))
        .group_by(Idea.id)
        .order_by(Idea.team_closed.asc(), votes.desc(), Idea.created_at.desc())
        .limit(1)
    )
    since = datetime.now(timezone.utc) - RECENT
    # Prefer something recent; fall back to anything eligible.
    return await db.scalar(base.where(Idea.created_at >= since)) or await db.scalar(base)


async def featured_idea_id(db) -> int | None:
    """Today's featured idea id, picking (and saving) one if none is set."""
    today = lagos_today()
    row = await db.scalar(
        _eligible(select(FeaturedIdea.idea_id).join(Idea, Idea.id == FeaturedIdea.idea_id)).where(
            FeaturedIdea.day == today
        )
    )
    if row is not None:
        return row
    # Today's pick was deleted/hidden, or there isn't one yet.
    await db.execute(FeaturedIdea.__table__.delete().where(FeaturedIdea.day == today))
    picked = await _auto_pick(db, today)
    if picked is None:
        await db.commit()
        return None
    db.add(FeaturedIdea(day=today, idea_id=picked))
    try:
        await db.commit()
    except IntegrityError:  # another request picked at the same moment
        await db.rollback()
        return await db.scalar(select(FeaturedIdea.idea_id).where(FeaturedIdea.day == today))
    return picked


async def set_featured(db, idea_id: int) -> None:
    """Admin choice for today (replaces any automatic pick)."""
    today = lagos_today()
    existing = await db.scalar(select(FeaturedIdea).where(FeaturedIdea.day == today))
    if existing is None:
        db.add(FeaturedIdea(day=today, idea_id=idea_id))
    else:
        existing.idea_id = idea_id
    await db.commit()
