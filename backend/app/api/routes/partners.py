"""Partners (hubs, bootcamps, accelerators): enquiries and community reports.

A partner's community joins through their tracking link (?ref=semicolon, or
?ref=semicolon-cohort5 for a sub-campaign). The report shows what those
members did: who posted, asked to join, and formed teams. Admins share it
with the partner as a private link (a signed token, no login needed).
Only public, non-hidden projects are listed, and no contact details.
"""

from __future__ import annotations

import asyncio
import html
import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select

from app.api.deps import AdminUser, DbSession
from app.core.config import settings
from app.core.security import create_partner_report_token
from app.email import send_email
from app.models import CollaborationRequest, GroupMember, GroupMessage, Idea, PartnerLead, User

logger = logging.getLogger("app.partners")
router = APIRouter(tags=["partners"])


# ------------------------------------------------------------------ enquiries
class PartnerInterestIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    organisation: str = Field(min_length=1, max_length=160)
    role: str | None = Field(default=None, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    community_size: str | None = Field(default=None, max_length=60)
    message: str | None = Field(default=None, max_length=2000)


class PartnerLeadOut(PartnerInterestIn):
    id: int
    created_at: datetime


@router.post("/partners/interest", status_code=status.HTTP_201_CREATED)
async def partner_interest(
    payload: PartnerInterestIn, db: DbSession, background_tasks: BackgroundTasks
) -> dict[str, bool]:
    """'Run a pilot with us' form on /partners. Saved, and emailed to the admins."""
    db.add(PartnerLead(**payload.model_dump()))
    await db.commit()
    background_tasks.add_task(_email_admins, payload)
    return {"ok": True}


async def _email_admins(payload: PartnerInterestIn) -> None:
    rows = "".join(
        f'<tr><td style="padding:4px 12px 4px 0;color:#71717a;">{k}</td><td style="padding:4px 0;">{html.escape(str(v))}</td></tr>'
        for k, v in payload.model_dump().items()
        if v
    )
    body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;">'
        f'<h1 style="margin:0 0 12px;font-size:20px;color:#111114;">New partner enquiry: {html.escape(payload.organisation)}</h1>'
        f'<table style="font-size:14px;color:#111114;">{rows}</table>'
        f'<p style="font-size:13px;color:#71717a;">All enquiries: {html.escape(settings.FRONTEND_URL.rstrip("/"))}/admin/partners</p></div>'
    )
    text = "\n".join(f"{k}: {v}" for k, v in payload.model_dump().items() if v)
    for to in settings.admin_emails_list:
        await send_email(to, f"Partner enquiry: {payload.organisation}", body, text)
        await asyncio.sleep(0.6)  # Resend's 2 requests/second limit


@router.get("/admin/partners/leads", response_model=list[PartnerLeadOut])
async def partner_leads(db: DbSession, admin: AdminUser) -> list[PartnerLead]:
    return list((await db.scalars(select(PartnerLead).order_by(PartnerLead.created_at.desc()).limit(200))).all())


# ------------------------------------------------------------------ report
class ReportProject(BaseModel):
    id: int
    title: str
    owner: str
    owner_is_member: bool  # the owner came through this partner's link
    team_size: int
    looking_for: list[str] = []
    team_closed: bool
    created_at: datetime


class WeekCount(BaseModel):
    week: str  # Monday, ISO date
    signups: int
    joined_team: int


class PartnerReport(BaseModel):
    ref: str
    generated_at: datetime
    members: int
    posted: int  # posted a project
    asked: int  # asked to join someone's project
    in_team: int  # accepted into a team, or accepted someone into theirs
    teams: int  # projects with 2+ people that involve the community
    active_teams: int  # of those, with group messages in the last 14 days
    weeks: list[WeekCount]
    projects: list[ReportProject]
    share_url: str | None = None


def _slug(ref: str) -> str:
    slug = re.sub(r"[^a-z0-9_-]", "", ref.strip().lower().lstrip("@"))[:60]
    if not slug:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a tracking name")
    return slug


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def build_report(db: DbSession, ref: str) -> PartnerReport:
    now = datetime.now(timezone.utc)
    users = (
        await db.execute(
            select(User.id, User.created_at).where(
                User.is_active.is_(True),
                or_(User.signup_source == ref, User.signup_source.like(f"{ref}-%")),
            )
        )
    ).all()
    ids = {u.id for u in users}

    posted = asked = in_team = 0
    projects: list[ReportProject] = []
    teams = active_teams = 0
    accepted_at: dict[int, datetime] = {}
    if ids:
        authors = set((await db.scalars(select(Idea.author_id).where(Idea.author_id.in_(ids)))).all())
        askers = set(
            (await db.scalars(select(CollaborationRequest.from_user_id).where(CollaborationRequest.from_user_id.in_(ids)))).all()
        )
        for from_id, to_id, at in (
            await db.execute(
                select(CollaborationRequest.from_user_id, CollaborationRequest.to_user_id, CollaborationRequest.updated_at).where(
                    CollaborationRequest.status == "accepted",
                    or_(CollaborationRequest.from_user_id.in_(ids), CollaborationRequest.to_user_id.in_(ids)),
                )
            )
        ).all():
            for uid in (from_id, to_id):
                if uid in ids:
                    accepted_at[uid] = min(accepted_at.get(uid, _utc(at)), _utc(at))
        posted, asked, in_team = len(authors), len(askers), len(accepted_at)

        # Projects the community owns or has joined.
        joined = set((await db.scalars(select(GroupMember.idea_id).where(GroupMember.user_id.in_(ids)))).all())
        size = (
            select(func.count()).select_from(GroupMember).where(GroupMember.idea_id == Idea.id).correlate(Idea).scalar_subquery()
        )
        rows = (
            await db.execute(
                select(Idea, User.full_name, size.label("size"))
                .join(User, User.id == Idea.author_id)
                .where(
                    or_(Idea.author_id.in_(ids), Idea.id.in_(joined)),
                    Idea.visibility == "public",
                    Idea.hidden.is_(False),
                )
                .order_by(size.desc(), Idea.created_at.desc())
            )
        ).all()
        team_ids = [idea.id for idea, _, n in rows if (n or 0) >= 2]
        teams = len(team_ids)
        if team_ids:
            active_teams = len(
                set(
                    (
                        await db.scalars(
                            select(GroupMessage.idea_id).where(
                                GroupMessage.idea_id.in_(team_ids), GroupMessage.created_at >= now - timedelta(days=14)
                            )
                        )
                    ).all()
                )
            )
        projects = [
            ReportProject(
                id=idea.id,
                title=idea.title,
                owner=owner,
                owner_is_member=idea.author_id in ids,
                team_size=n or 0,
                looking_for=idea.looking_for or [],
                team_closed=idea.team_closed,
                created_at=idea.created_at,
            )
            for idea, owner, n in rows[:60]
        ]

    # Last 8 weeks: sign-ups, and members whose first team acceptance fell in that week.
    week0 = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(weeks=7)
    weeks = {(week0 + timedelta(weeks=i)).date().isoformat(): [0, 0] for i in range(8)}

    def bucket(at: datetime) -> str | None:
        at = _utc(at)
        if at < week0:
            return None
        key = (week0 + timedelta(weeks=(at - week0).days // 7)).date().isoformat()
        return key if key in weeks else None

    for u in users:
        if (k := bucket(u.created_at)) is not None:
            weeks[k][0] += 1
    for at in accepted_at.values():
        if (k := bucket(at)) is not None:
            weeks[k][1] += 1

    return PartnerReport(
        ref=ref,
        generated_at=now,
        members=len(ids),
        posted=posted,
        asked=asked,
        in_team=in_team,
        teams=teams,
        active_teams=active_teams,
        weeks=[WeekCount(week=k, signups=v[0], joined_team=v[1]) for k, v in weeks.items()],
        projects=projects,
    )


def share_url(ref: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/partner-report/{create_partner_report_token(ref)}"


@router.get("/admin/partners/report", response_model=PartnerReport)
async def admin_partner_report(db: DbSession, admin: AdminUser, ref: str = Query(..., max_length=80)) -> PartnerReport:
    slug = _slug(ref)
    report = await build_report(db, slug)
    report.share_url = share_url(slug)
    return report


@router.get("/partners/report", response_model=PartnerReport)
async def public_partner_report(db: DbSession, token: str = Query(..., max_length=1000)) -> PartnerReport:
    """The partner's view, opened from the private link an admin shared."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        payload = {}
    if payload.get("type") != "partner_report" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This report link isn't valid")
    return await build_report(db, payload["sub"])
