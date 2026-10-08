"""Who's online, from the live WebSocket each open LikeMinds tab keeps.

A user is online while they have at least one socket connected; when the
last one closes they go offline and `last_seen_at` records when. Presence
lives in this process (see app/realtime.py), so on startup everyone is
reset to offline.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.models import User

logger = logging.getLogger("app.presence")


async def set_presence(user_id: int, online: bool) -> None:
    """Mark a user online/offline and stamp last_seen_at. Never raises."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(is_online=online, last_seen_at=datetime.now(timezone.utc))
                .execution_options(synchronize_session=False)
            )
            await db.commit()
    except Exception:
        logger.exception("Failed to update presence for user %s", user_id)


async def reset_presence() -> None:
    """No sockets survive a restart, so nobody is online yet."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.is_online.is_(True)).values(is_online=False))
            await db.commit()
    except Exception:
        logger.exception("Failed to reset presence on startup")
