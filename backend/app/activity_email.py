"""Activity emails: bring people back when something needs their reply.

Sent for comments on your idea, requests to join your project, accepted
requests, and direct messages. Rules, so this never turns into spam:

- skipped while the recipient has LikeMinds open (live WebSocket) — they'll
  see the in-app notification instead;
- at most one activity email per user per THROTTLE window;
- respects the `email_activity` preference, and every email carries a
  one-click unsubscribe link.

Run as a FastAPI background task after the response is sent: it opens its
own DB session and never raises.
"""

from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, update

from app.core.config import settings
from app.core.security import create_unsubscribe_token
from app.db.session import AsyncSessionLocal
from app.email import send_email
from app.email_layout import button, wrap
from app.models import User
from app.realtime import manager

logger = logging.getLogger("app.activity_email")

THROTTLE = timedelta(minutes=15)


async def _claim_send_slot(db, user_id: int) -> bool:
    """Atomically take this user's email slot; False if one was sent recently."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(User)
        .where(
            User.id == user_id,
            or_(User.last_activity_email_at.is_(None), User.last_activity_email_at < now - THROTTLE),
        )
        .values(last_activity_email_at=now)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return result.rowcount == 1


def _content(
    *, first_name: str, headline: str, preview: str | None, cta_label: str, cta_url: str, unsub_url: str
) -> tuple[str, str]:
    """(html, text). `headline` and `preview` are user content — escaped here."""
    text = f"Hi {first_name},\n\n{headline}\n\n"
    if preview:
        text += f'"{preview}"\n\n'
    text += f"{cta_label}: {cta_url}\n\n— LikeMinds\n\nStop these emails: {unsub_url}"

    quote = (
        f"""<p style="margin:0 0 20px;padding:12px 16px;background:#f9f5ff;border-left:3px solid #7e2bd1;
                  border-radius:8px;font-size:15px;line-height:1.6;color:#3f3f46;">{html.escape(preview)}</p>"""
        if preview
        else ""
    )
    inner = f"""            <p style="margin:0 0 6px;font-size:15px;color:#3f3f46;">Hi {html.escape(first_name)},</p>
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.4;color:#111114;">{html.escape(headline)}</h1>
            {quote}
            {button(cta_label, cta_url)}"""
    body = wrap(
        inner, reason="You're getting this because of activity on your LikeMinds account.", unsub_url=unsub_url
    )
    return body, text


async def send_activity_email(
    recipient_id: int,
    *,
    subject: str,
    headline: str,
    path: str,
    cta_label: str,
    preview: str | None = None,
) -> None:
    """Email `recipient_id` about new activity, subject to the rules above.

    `path` is the frontend route the button opens (e.g. "/messages").
    """
    try:
        if not settings.email_enabled or manager.is_connected(recipient_id):
            return
        async with AsyncSessionLocal() as db:
            user = await db.get(User, recipient_id)
            if user is None or not user.is_active or not user.wants_activity_email:
                return
            if not await _claim_send_slot(db, recipient_id):
                return
            email, first_name = user.email, (user.full_name or "there").split(" ")[0]

        base = settings.FRONTEND_URL.rstrip("/")
        unsub_url = f"{base}/unsubscribe?token={create_unsubscribe_token(recipient_id)}"
        if preview and len(preview) > 220:
            preview = preview[:220].rstrip() + "…"
        body, text = _content(
            first_name=first_name,
            headline=headline,
            preview=preview,
            cta_label=cta_label,
            cta_url=f"{base}{path}",
            unsub_url=unsub_url,
        )
        await send_email(email, subject, body, text)
    except Exception:
        logger.exception("Activity email to user %s failed", recipient_id)
