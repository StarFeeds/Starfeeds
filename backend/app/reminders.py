"""Daily nudge for project owners with join requests waiting on them.

A request left pending is the moment a would-be collaborator gives up, so
once it has waited REMIND_AFTER we email the owner one summary of everyone
waiting. Each request is reminded about once (reminded_at); requests older
than GIVE_UP_AFTER are left alone. Respects the activity-email preference
and uses its unsubscribe scope.

Triggered daily by POST /internal/reminders/daily (GitHub Actions cron).
"""

from __future__ import annotations

import asyncio
import html
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.core.config import settings
from app.core.security import create_unsubscribe_token
from app.db.session import AsyncSessionLocal
from app.email import send_email
from app.email_layout import button, wrap
from app.models import CollaborationRequest, Idea, User

logger = logging.getLogger("app.reminders")

REMIND_AFTER = timedelta(hours=48)
GIVE_UP_AFTER = timedelta(days=14)
SEND_INTERVAL_SECONDS = 0.6  # Resend's default limit is 2 requests/second.


def render(first_name: str, waiting: list[tuple[str, str, str | None]], base: str, unsub: str) -> tuple[str, str, str]:
    """(subject, html, text). `waiting` = [(requester name, idea title, note)]."""
    n = len(waiting)
    subject = (
        f'{waiting[0][0]} is waiting to join "{waiting[0][1]}"'
        if n == 1
        else f"{n} people are waiting to join your projects"
    )
    rows_html, rows_text = "", ""
    for name, title, note in waiting:
        quote = (
            f'<div style="margin-top:4px;font-size:14px;color:#3f3f46;font-style:italic;">“{html.escape(note)}”</div>'
            if note
            else ""
        )
        rows_html += (
            '<div style="margin:0 0 10px;padding:12px 16px;border:1px solid #ececf1;border-radius:12px;">'
            f'<div style="font-size:15px;color:#111114;"><b>{html.escape(name)}</b> wants to join '
            f"<b>{html.escape(title)}</b></div>{quote}</div>"
        )
        rows_text += f'- {name} wants to join "{title}"' + (f': "{note}"' if note else "") + "\n"

    inner = (
        f'<p style="margin:0 0 6px;font-size:15px;color:#3f3f46;">Hi {html.escape(first_name)},</p>\n'
        f'<h1 style="margin:0 0 16px;font-size:20px;line-height:1.4;color:#111114;">'
        f"{'Someone is' if n == 1 else f'{n} people are'} still waiting to hear back</h1>\n"
        f"{rows_html}\n"
        '<p style="margin:6px 0 20px;font-size:14px;line-height:1.6;color:#71717a;">'
        "A quick yes or no keeps people coming back, even a no.</p>\n"
        f"{button('Review requests', base + '/activity')}"
    )
    body = wrap(
        inner, reason="You're getting this because of activity on your LikeMinds account.", unsub_url=unsub
    )
    text = (
        f"Hi {first_name},\n\nStill waiting to hear back:\n{rows_text}\n"
        f"Review requests: {base}/activity\n\n— LikeMinds\n\nStop these emails: {unsub}"
    )
    return subject, body, text


async def send_pending_request_reminders() -> dict[str, int]:
    """Email each owner once about requests pending > REMIND_AFTER. Never raises."""
    counts = {"owners_emailed": 0, "requests_reminded": 0, "skipped": 0, "failed": 0}
    if not settings.email_enabled:
        return counts
    now = datetime.now(timezone.utc)
    base = settings.FRONTEND_URL.rstrip("/")
    try:
        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(CollaborationRequest.id, CollaborationRequest.to_user_id, User.full_name, Idea.title, CollaborationRequest.message)
                    .join(User, User.id == CollaborationRequest.from_user_id)
                    .join(Idea, Idea.id == CollaborationRequest.idea_id)
                    .where(
                        CollaborationRequest.status == "pending",
                        CollaborationRequest.reminded_at.is_(None),
                        CollaborationRequest.created_at < now - REMIND_AFTER,
                        CollaborationRequest.created_at > now - GIVE_UP_AFTER,
                    )
                    .order_by(CollaborationRequest.created_at)
                )
            ).all()
            by_owner: dict[int, list] = defaultdict(list)
            for req_id, owner_id, name, title, note in rows:
                by_owner[owner_id].append((req_id, name, title, note))

            for owner_id, reqs in by_owner.items():
                owner = await db.get(User, owner_id)
                ids = [r[0] for r in reqs]
                # Mark first, so a failure or opt-out never causes repeat nagging.
                await db.execute(
                    update(CollaborationRequest)
                    .where(CollaborationRequest.id.in_(ids))
                    .values(reminded_at=now)
                    .execution_options(synchronize_session=False)
                )
                await db.commit()
                if owner is None or not owner.is_active or not owner.wants_activity_email:
                    counts["skipped"] += 1
                    continue
                unsub = f"{base}/unsubscribe?token={create_unsubscribe_token(owner_id)}"
                subject, body, text = render(
                    (owner.full_name or "there").split(" ")[0], [r[1:] for r in reqs], base, unsub
                )
                if await send_email(owner.email, subject, body, text):
                    counts["owners_emailed"] += 1
                    counts["requests_reminded"] += len(ids)
                else:
                    counts["failed"] += 1
                await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except Exception:
        logger.exception("Pending-request reminders crashed")
    logger.info("Pending-request reminders: %s", counts)
    return counts
