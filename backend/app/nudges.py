"""'Come back' emails for members who signed up but never took part.

Inactive = no idea, comment, join request, upvote, save, message or group
message. They get at most two automatic nudges, then never again:

  1. ~2 days after sign-up: what people are building + "share yours".
  2. ~5 days later: one specific ask ("3 projects are looking for a Designer").

Members who joined before this existed get one admin-triggered catch-up
email instead (counts as both nudges). Each email shows real recent
projects; with nothing fresh to show, the nudge waits for another day.
Respects the `tips` preference and its unsubscribe scope.
"""

from __future__ import annotations

import asyncio
import html
import logging
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, exists, func, select, update

from app.core.config import settings
from app.core.security import create_unsubscribe_token
from app.db.session import AsyncSessionLocal
from app.email import send_email
from app.email_layout import button, wrap
from app.models import (
    CollaborationRequest,
    Comment,
    GroupMessage,
    Idea,
    Message,
    SavedIdea,
    Upvote,
    User,
)

logger = logging.getLogger("app.nudges")

FIRST_NUDGE_AFTER = timedelta(days=2)
SECOND_NUDGE_AFTER = timedelta(days=5)  # after the first, i.e. ~day 7
AUTO_WINDOW = timedelta(days=30)  # older sign-ups get the catch-up email instead
FRESH_PROJECTS = timedelta(days=30)
SEND_INTERVAL_SECONDS = 0.6  # Resend's default limit is 2 requests/second.


def inactive_condition():
    """SQL condition: the user has never taken part in any way."""
    return and_(
        ~exists().where(Idea.author_id == User.id),
        ~exists().where(Comment.author_id == User.id),
        ~exists().where(CollaborationRequest.from_user_id == User.id),
        ~exists().where(Upvote.user_id == User.id),
        ~exists().where(SavedIdea.user_id == User.id),
        ~exists().where(Message.sender_id == User.id),
        ~exists().where(GroupMessage.sender_id == User.id),
    )


@dataclass
class Project:
    id: int
    title: str
    author: str
    roles: list[str]
    upvotes: int


async def _fresh_projects(db, now: datetime) -> list[Project]:
    """Recent public projects, ones recruiting first, then most upvoted."""
    votes = func.count(Upvote.id)
    rows = (
        await db.execute(
            select(Idea.id, Idea.title, User.full_name, Idea.looking_for, votes)
            .join(User, User.id == Idea.author_id)
            .outerjoin(Upvote, Upvote.idea_id == Idea.id)
            .where(Idea.created_at >= now - FRESH_PROJECTS, Idea.visibility == "public", Idea.hidden.is_(False))
            .group_by(Idea.id, User.full_name)
            .order_by(Idea.created_at.desc())
            .limit(30)
        )
    ).all()
    projects = [Project(r[0], r[1], r[2], list(r[3] or []), r[4]) for r in rows]
    projects.sort(key=lambda p: (not p.roles, -p.upvotes))
    return projects


def _project_cards(projects: list[Project], base: str) -> tuple[str, str]:
    html_rows, text_rows = "", ""
    for p in projects:
        roles = f" · looking for {', '.join(p.roles)}" if p.roles else ""
        html_rows += (
            f'<a href="{html.escape(base)}/i/{p.id}" style="display:block;margin:0 0 10px;padding:12px 16px;'
            'border:1px solid #ececf1;border-radius:12px;text-decoration:none;">'
            f'<div style="font-size:15px;font-weight:bold;color:#111114;">{html.escape(p.title)}</div>'
            f'<div style="font-size:13px;color:#71717a;">by {html.escape(p.author)}{html.escape(roles)}</div></a>'
        )
        text_rows += f"- {p.title} by {p.author}{roles}: {base}/i/{p.id}\n"
    return html_rows, text_rows


def _role_ask(projects: list[Project]) -> str | None:
    """'3 projects are looking for a Designer', from the most-wanted role."""
    counts = Counter(r for p in projects for r in p.roles)
    if not counts:
        return None
    role, n = counts.most_common(1)[0]
    article = "an" if role[:1].lower() in "aeiou" else "a"
    return f"{'A project is' if n == 1 else f'{n} projects are'} looking for {article} {role}"


def render(kind: str, first_name: str, projects: list[Project], base: str, unsub: str) -> tuple[str, str, str] | None:
    """(subject, html, text) for kind = first | second | catchup, or None to skip."""
    shown = projects[:3]
    cards_html, cards_text = _project_cards(shown, base)
    hi = f'<p style="margin:0 0 6px;font-size:15px;color:#3f3f46;">Hi {html.escape(first_name)},</p>\n'
    p_style = 'style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;"'
    h_style = 'style="margin:0 0 14px;font-size:20px;line-height:1.4;color:#111114;"'
    browse = f'<a href="{base}/home" style="color:#4d0695;font-weight:bold;">Browse projects</a>'

    if kind == "first":
        if not shown:
            return None
        subject = "Here's what people are building on LikeMinds"
        intro = "People are sharing what they're building and finding collaborators. A few from this week:"
        headline = "What are you working on?"
        cta = ("Share what you're working on", f"{base}/home")
        closing = f"Post it in two lines, or {browse} if you'd rather join someone's team."
    elif kind == "second":
        ask = _role_ask(projects)
        if not shown:
            return None
        subject = ask or f"{len(projects)} new projects on LikeMinds"
        headline = (ask + ". Could it be you?") if ask else "New projects are looking for people"
        intro = "These teams are looking for collaborators right now:"
        cta = ("Find a project to join", f"{base}/home")
        closing = "Or share your own idea and let people come to you. This is our last nudge."
    else:  # catchup
        subject = "We've been busy: here's what's new on LikeMinds"
        headline = "LikeMinds got a lot better"
        intro = (
            "Since you joined, we've made it much easier to find people to build with: shareable project pages, "
            '"Looking for" roles on every project, notes with join requests, comment replies and Google sign-in.'
        )
        if shown:
            intro += " Here's what people are building:"
        cta = ("Share what you're working on", f"{base}/home")
        closing = f"Or {browse} and ask to join one."

    inner = (
        hi
        + f"<h1 {h_style}>{html.escape(headline)}</h1>\n"
        + f"<p {p_style}>{html.escape(intro)}</p>\n"
        + cards_html
        + f'<p style="margin:18px 0 14px;">{button(*cta)}</p>\n'
        + f'<p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;">{closing}</p>'
    )
    body = wrap(inner, reason="You're getting this because you joined LikeMinds.", unsub_url=unsub)
    closing_text = closing.replace(browse, f"browse projects ({base}/home)")
    text = (
        f"Hi {first_name},\n\n{headline}\n\n{intro}\n\n{cards_text}\n"
        f"{cta[0]}: {cta[1]}\n{closing_text}\n\n— LikeMinds\n\nStop these emails: {unsub}"
    )
    return subject, body, text


async def _send(db, user_id: int, email: str, name: str, kind: str, projects: list[Project], now: datetime) -> bool | None:
    """Send one nudge; record it. None = skipped (nothing worth sending)."""
    base = settings.FRONTEND_URL.rstrip("/")
    unsub = f"{base}/unsubscribe?token={create_unsubscribe_token(user_id, scope='tips')}"
    rendered = render(kind, (name or "there").split(" ")[0], projects, base, unsub)
    if rendered is None:
        return None
    ok = await send_email(email, *rendered)
    if ok:
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(nudge_count=1 if kind == "first" else 2, last_nudge_at=now)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
    return ok


def _wants_tips(prefs: dict | None) -> bool:
    return bool((prefs or {}).get("tips", True))


async def send_due_nudges() -> dict[str, int]:
    """Daily: first nudge at ~day 2, second at ~day 7, then never again. Never raises."""
    counts = {"first": 0, "second": 0, "skipped": 0, "failed": 0}
    if not settings.email_enabled:
        return counts
    now = datetime.now(timezone.utc)
    try:
        async with AsyncSessionLocal() as db:
            projects = await _fresh_projects(db, now)
            base_q = select(User.id, User.email, User.full_name, User.notification_prefs, User.nudge_count).where(
                User.is_active.is_(True), inactive_condition()
            )
            due = (
                await db.execute(
                    base_q.where(
                        (
                            (User.nudge_count == 0)
                            & (User.created_at <= now - FIRST_NUDGE_AFTER)
                            & (User.created_at >= now - AUTO_WINDOW)
                        )
                        | ((User.nudge_count == 1) & (User.last_nudge_at <= now - SECOND_NUDGE_AFTER))
                    )
                )
            ).all()
            for user_id, email, name, prefs, sent_before in due:
                if not _wants_tips(prefs):
                    counts["skipped"] += 1
                    continue
                kind = "first" if sent_before == 0 else "second"
                ok = await _send(db, user_id, email, name, kind, projects, now)
                counts[kind if ok else "skipped" if ok is None else "failed"] += 1
                if ok is not None:
                    await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except Exception:
        logger.exception("Nudges crashed")
    logger.info("Nudges: %s", counts)
    return counts


async def catch_up_audience(db) -> list[tuple]:
    """Inactive members, never nudged, who joined before the automatic
    window (newer ones get the day-2/day-7 nudges instead)."""
    cutoff = datetime.now(timezone.utc) - AUTO_WINDOW
    rows = (
        await db.execute(
            select(User.id, User.email, User.full_name, User.notification_prefs).where(
                User.is_active.is_(True),
                User.nudge_count == 0,
                User.created_at < cutoff,
                inactive_condition(),
            )
        )
    ).all()
    return [r for r in rows if _wants_tips(r[3])]


async def send_catch_up() -> dict[str, int]:
    """One-off 'what's new' email to existing inactive members. Never raises."""
    counts = {"sent": 0, "failed": 0}
    if not settings.email_enabled:
        return counts
    now = datetime.now(timezone.utc)
    try:
        async with AsyncSessionLocal() as db:
            projects = await _fresh_projects(db, now)
            for user_id, email, name, _ in await catch_up_audience(db):
                ok = await _send(db, user_id, email, name, "catchup", projects, now)
                counts["sent" if ok else "failed"] += 1
                await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except Exception:
        logger.exception("Catch-up email crashed")
    logger.info("Catch-up email: %s", counts)
    return counts
