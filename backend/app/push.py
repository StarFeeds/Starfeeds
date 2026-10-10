"""Browser push notifications (Web Push with VAPID; no app or paid service).

Pushes go only to users who don't have LikeMinds open (no live WebSocket);
when they're online the in-app realtime update already reaches them. Sends
run as background tasks so they never slow a request, and subscriptions
the push service says are gone (404/410) are deleted.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import PushSubscription

logger = logging.getLogger("app.push")

# Group chats can be busy: at most one push per person per chat per window.
GROUP_THROTTLE_SECONDS = 600
_last_group_push: dict[tuple[int, int], float] = {}
_tasks: set[asyncio.Task] = set()  # keep references so tasks aren't GC'd


def _send_one(sub: PushSubscription, payload: str) -> int | None:
    """Blocking send; returns an HTTP status on failure, None on success."""
    try:
        webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            ttl=60 * 60 * 24,
        )
        return None
    except WebPushException as e:
        return e.response.status_code if e.response is not None else 0


async def send_push(user_id: int, *, title: str, body: str, url: str, tag: str | None = None) -> int:
    """Push to every browser the user subscribed. Returns how many got it. Never raises."""
    if not settings.push_enabled:
        return 0
    payload = json.dumps({"title": title, "body": body[:180], "url": url, "tag": tag or url})
    sent = 0
    try:
        async with AsyncSessionLocal() as db:
            subs = (await db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id))).all()
            gone = []
            for sub in subs:
                status = await asyncio.to_thread(_send_one, sub, payload)
                if status is None:
                    sent += 1
                elif status in (404, 410):
                    gone.append(sub.id)
                else:
                    logger.warning("Push to user %s failed with status %s", user_id, status)
            if gone:
                await db.execute(delete(PushSubscription).where(PushSubscription.id.in_(gone)))
                await db.commit()
    except Exception:
        logger.exception("Push to user %s crashed", user_id)
    return sent


def push_if_offline(user_id: int, *, title: str, body: str, url: str, tag: str | None = None) -> None:
    """Fire-and-forget push, skipped while the user has LikeMinds open."""
    from app.realtime import manager  # local import: realtime imports this module

    if not settings.push_enabled or manager.is_connected(user_id):
        return
    task = asyncio.get_running_loop().create_task(send_push(user_id, title=title, body=body, url=url, tag=tag))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def push_group_if_offline(user_id: int, idea_id: int, *, title: str, body: str) -> None:
    """Like push_if_offline, throttled per user per project chat."""
    key = (user_id, idea_id)
    now = time.monotonic()
    if now - _last_group_push.get(key, 0) < GROUP_THROTTLE_SECONDS:
        return
    from app.realtime import manager

    if not settings.push_enabled or manager.is_connected(user_id):
        return
    _last_group_push[key] = now
    push_if_offline(user_id, title=title, body=body, url=f"/projects/{idea_id}/discussion", tag=f"group-{idea_id}")


def notification_push(notif: Any, actor: Any) -> dict[str, str]:
    """Title/body/url for an in-app Notification (comments, joins, etc.)."""
    who = getattr(actor, "full_name", None)
    body = f"{who} {notif.text}" if who else notif.text
    if notif.type in ("comment", "upvote") and notif.idea_id:
        url = f"/i/{notif.idea_id}"
    elif notif.type == "collab":
        url = "/activity"
    else:
        url = "/notifications"
    return {"title": "LikeMinds", "body": body, "url": url, "tag": f"n-{notif.id}"}
