"""Email copy of an admin announcement (optional, from the admin page).

Goes to active users with the "General Announcements" pref on (the default).
Runs as a background task after the broadcast request returns, paced for
Resend's rate limit, with a one-click unsubscribe that turns announcements off.
"""

from __future__ import annotations

import asyncio
import html
import logging

from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_unsubscribe_token
from app.db.session import AsyncSessionLocal
from app.email import send_email
from app.email_layout import button, wrap
from app.models import User

logger = logging.getLogger("app.announcement_email")

# Resend's default limit is 2 requests/second.
SEND_INTERVAL_SECONDS = 0.6


def render(first_name: str, text: str, base_url: str, unsub_url: str) -> tuple[str, str, str]:
    """(subject, html, text). `text` is the admin's message, escaped here."""
    first_line = text.strip().splitlines()[0]
    subject = first_line if len(first_line) <= 70 else first_line[:67].rstrip() + "…"
    paragraphs = "".join(
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">{html.escape(p)}</p>'
        for p in (p.strip() for p in text.split("\n")) if p
    )
    inner = (
        f'<p style="margin:0 0 14px;font-size:15px;color:#3f3f46;">Hi {html.escape(first_name)},</p>\n'
        f"{paragraphs}\n"
        f'<p style="margin:10px 0 0;">{button("Open LikeMinds", base_url + "/home")}</p>'
    )
    body = wrap(
        inner,
        reason="You're getting this because LikeMinds announcements are on in your settings.",
        unsub_url=unsub_url,
    )
    plain = f"Hi {first_name},\n\n{text.strip()}\n\nOpen LikeMinds: {base_url}/home\n\n— LikeMinds\n\nStop announcement emails: {unsub_url}"
    return subject, body, plain


async def send_announcement_emails(user_ids: list[int], text: str) -> dict[str, int]:
    """Email `text` to these users (re-checking prefs at send time). Never raises."""
    counts = {"sent": 0, "failed": 0}
    if not settings.email_enabled:
        logger.info("Announcement email skipped: email disabled")
        return counts
    base = settings.FRONTEND_URL.rstrip("/")
    try:
        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(User.id, User.email, User.full_name, User.notification_prefs).where(
                        User.id.in_(user_ids), User.is_active.is_(True)
                    )
                )
            ).all()
        for user_id, email, full_name, prefs in rows:
            if not (prefs or {}).get("announcements", True):
                continue
            unsub = f"{base}/unsubscribe?token={create_unsubscribe_token(user_id, scope='announcements')}"
            subject, body, plain = render((full_name or "there").split(" ")[0], text, base, unsub)
            counts["sent" if await send_email(email, subject, body, plain) else "failed"] += 1
            await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except Exception:
        logger.exception("Announcement email run crashed")
    logger.info("Announcement emails: %s", counts)
    return counts
