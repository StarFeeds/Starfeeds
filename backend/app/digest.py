"""Weekly digest email: a reason to come back for people who didn't get a
comment or message this week.

Each opted-in user (`weekly` pref) gets: what happened on their ideas in the
last 7 days (upvotes, comments, join requests), unread messages, and the top
new projects posted that week by others. Users with nothing to show are
skipped.

Triggered once a week by POST /internal/digest/weekly (GitHub Actions cron).
`users.last_digest_at` makes re-runs safe: anyone mailed in the last 6 days
is skipped.
"""

from __future__ import annotations

import asyncio
import html
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select, update

from app.core.config import settings
from app.core.security import create_unsubscribe_token
from app.db.session import AsyncSessionLocal
from app.email import send_email
from app.email_layout import button, wrap
from app.models import CollaborationRequest, Comment, Conversation, Idea, Message, Notification, Upvote, User

logger = logging.getLogger("app.digest")

WINDOW = timedelta(days=7)
RESEND_GAP = timedelta(days=6)
# Resend's default limit is 2 requests/second.
SEND_INTERVAL_SECONDS = 0.6
TOP_IDEAS = 3


@dataclass
class TopIdea:
    id: int
    title: str
    category: str
    author_id: int
    author_name: str
    upvotes: int


@dataclass
class UserWeek:
    upvotes: int = 0
    comments: int = 0
    join_requests: int = 0
    unread_messages: int = 0
    top: list[TopIdea] = field(default_factory=list)

    @property
    def has_own_activity(self) -> bool:
        return bool(self.upvotes or self.comments or self.join_requests or self.unread_messages)


async def _top_new_ideas(db, since: datetime) -> list[TopIdea]:
    """Public ideas posted this week, most upvoted first (a few spare so we
    can drop the reader's own)."""
    votes = func.count(Upvote.id)
    rows = (
        await db.execute(
            select(Idea.id, Idea.title, Idea.category, Idea.author_id, User.full_name, votes)
            .join(User, User.id == Idea.author_id)
            .outerjoin(Upvote, Upvote.idea_id == Idea.id)
            .where(Idea.created_at >= since, Idea.visibility == "public", Idea.hidden.is_(False))
            .group_by(Idea.id, User.full_name)
            .order_by(votes.desc(), Idea.created_at.desc())
            .limit(TOP_IDEAS + 3)
        )
    ).all()
    return [TopIdea(*r) for r in rows]


async def _user_week(db, user_id: int, since: datetime, top: list[TopIdea]) -> UserWeek:
    week = UserWeek()
    # Upvote rows carry no timestamp; their notifications do.
    week.upvotes = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.type == "upvote", Notification.created_at >= since)
    ) or 0
    week.comments = await db.scalar(
        select(func.count())
        .select_from(Comment)
        .join(Idea, Idea.id == Comment.idea_id)
        .where(Idea.author_id == user_id, Comment.author_id != user_id, Comment.created_at >= since)
    ) or 0
    week.join_requests = await db.scalar(
        select(func.count())
        .select_from(CollaborationRequest)
        .where(CollaborationRequest.to_user_id == user_id, CollaborationRequest.created_at >= since)
    ) or 0
    week.unread_messages = await db.scalar(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(
            or_(Conversation.user_a_id == user_id, Conversation.user_b_id == user_id),
            Message.sender_id != user_id,
            Message.read.is_(False),
        )
    ) or 0
    week.top = [t for t in top if t.author_id != user_id][:TOP_IDEAS]
    return week


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def _subject(week: UserWeek) -> str:
    parts = []
    if week.upvotes:
        parts.append(_plural(week.upvotes, "upvote"))
    if week.comments:
        parts.append(_plural(week.comments, "comment"))
    if week.join_requests:
        parts.append(_plural(week.join_requests, "join request"))
    if parts:
        return "Your week on LikeMinds: " + ", ".join(parts)
    if week.unread_messages:
        return f"You have {_plural(week.unread_messages, 'unread message')} on LikeMinds"
    if week.top:
        return f"{_plural(len(week.top), 'new project')} worth a look on LikeMinds"
    return "Your week on LikeMinds"


def render(first_name: str, week: UserWeek, base_url: str, unsub_url: str) -> tuple[str, str, str]:
    """(subject, html, text) for one user's digest."""
    stat_rows = [
        (week.upvotes, "upvote", "on your ideas"),
        (week.comments, "comment", "on your ideas"),
        (week.join_requests, "request", "to join your projects"),
        (week.unread_messages, "unread message", "waiting for you"),
    ]
    stats = [(n, f"{_plural(n, w)} {tail}") for n, w, tail in stat_rows if n]

    text = f"Hi {first_name},\n\nHere's your week on LikeMinds.\n\n"
    inner = (
        f'<p style="margin:0 0 6px;font-size:15px;color:#3f3f46;">Hi {html.escape(first_name)},</p>\n'
        '<h1 style="margin:0 0 18px;font-size:20px;line-height:1.4;color:#111114;">Here\'s your week on LikeMinds</h1>\n'
    )
    if stats:
        text += "".join(f"- {line}\n" for _, line in stats) + "\n"
        inner += '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">'
        for n, line in stats:
            label = line.split(" ", 1)[1]
            inner += (
                f'<tr><td style="padding:4px 12px 4px 0;font-size:22px;font-weight:bold;color:#4d0695;">{n}</td>'
                f'<td style="padding:4px 0;font-size:15px;color:#3f3f46;">{html.escape(label)}</td></tr>'
            )
        inner += "</table>\n"
        inner += f'<p style="margin:0 0 24px;">{button("See what happened", base_url + "/notifications")}</p>\n'

    if week.top:
        text += "New this week:\n"
        inner += (
            '<p style="margin:0 0 10px;font-size:13px;font-weight:bold;letter-spacing:0.5px;'
            'text-transform:uppercase;color:#7e2bd1;">New this week</p>\n'
        )
        for t in week.top:
            text += f"- {t.title} by {t.author_name} ({t.category})\n"
            inner += (
                '<div style="margin:0 0 10px;padding:12px 16px;border:1px solid #ececf1;border-radius:12px;">'
                f'<div style="font-size:15px;font-weight:bold;color:#111114;">{html.escape(t.title)}</div>'
                f'<div style="font-size:13px;color:#71717a;">by {html.escape(t.author_name)} · '
                f"{html.escape(t.category)} · {_plural(t.upvotes, 'upvote')}</div></div>\n"
            )
        if not stats:
            inner += f'<p style="margin:16px 0 0;">{button("Explore projects", base_url + "/home")}</p>\n'
        text += "\n"

    if not stats and not week.top:
        # Only reachable for test sends; real runs skip empty weeks.
        text += "It was a quiet week. Share what you're working on to get things moving.\n\n"
        inner += (
            '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">It was a quiet week. '
            "Share what you're working on to get things moving.</p>\n"
            f'<p style="margin:0;">{button("Share a project", base_url + "/home")}</p>\n'
        )

    text += f"Open LikeMinds: {base_url}/home\n\n— LikeMinds\n\nStop weekly digests: {unsub_url}"
    body = wrap(inner, reason="You're getting the LikeMinds weekly digest.", unsub_url=unsub_url)
    return _subject(week), body, text


async def send_weekly_digest(only_email: str | None = None) -> dict[str, int]:
    """Send this week's digest to everyone opted in. Never raises.

    `only_email` sends a test copy to that one user instead: it ignores the
    weekly pref and the 6-day guard, sends even on a quiet week, and doesn't
    count as their weekly send.
    """
    counts = {"sent": 0, "skipped_empty": 0, "failed": 0}
    if not settings.email_enabled:
        logger.info("Weekly digest skipped: email disabled")
        return counts
    now = datetime.now(timezone.utc)
    since = now - WINDOW
    base = settings.FRONTEND_URL.rstrip("/")
    try:
        async with AsyncSessionLocal() as db:
            top = await _top_new_ideas(db, since)
            query = select(User.id, User.email, User.full_name, User.notification_prefs)
            if only_email:
                query = query.where(func.lower(User.email) == only_email.strip().lower())
            else:
                query = query.where(
                    User.is_active.is_(True),
                    or_(User.last_digest_at.is_(None), User.last_digest_at < now - RESEND_GAP),
                    # Don't stack the digest on top of a recent "come back" nudge.
                    or_(User.last_nudge_at.is_(None), User.last_nudge_at < now - timedelta(days=3)),
                )
            users = (await db.execute(query)).all()
            if only_email and not users:
                logger.warning("Test digest: no user with email %s", only_email)

            for user_id, email, full_name, prefs in users:
                if not only_email and not (prefs or {}).get("weekly", True):
                    continue
                week = await _user_week(db, user_id, since, top)
                if not only_email and not week.has_own_activity and not week.top:
                    counts["skipped_empty"] += 1
                    continue
                unsub = f"{base}/unsubscribe?token={create_unsubscribe_token(user_id, scope='weekly')}"
                subject, body, text = render((full_name or "there").split(" ")[0], week, base, unsub)
                if only_email:
                    counts["sent" if await send_email(email, subject, body, text) else "failed"] += 1
                elif await send_email(email, subject, body, text):
                    counts["sent"] += 1
                    await db.execute(
                        update(User)
                        .where(User.id == user_id)
                        .values(last_digest_at=now)
                        .execution_options(synchronize_session=False)
                    )
                    await db.commit()
                else:
                    counts["failed"] += 1
                await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except Exception:
        logger.exception("Weekly digest run crashed")
    logger.info("Weekly digest: %s", counts)
    return counts
