from datetime import datetime

from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.user import UserPublic


def _clean_project_url(v: str | None) -> str | None:
    """Blank -> None; bare domains get https://; only http(s) URLs allowed."""
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if "://" not in v:
        v = "https://" + v
    parsed = urlparse(v)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or "." not in parsed.hostname:
        raise ValueError("Enter a valid web link, e.g. https://myproject.com")
    return v


def _clean_roles(v: list[str] | None) -> list[str] | None:
    """Trim, drop blanks/duplicates (case-insensitive), cap at 6 roles of 40 chars."""
    if v is None:
        return None
    out: list[str] = []
    for role in v:
        role = role.strip()[:40]
        if role and role.lower() not in (r.lower() for r in out):
            out.append(role)
    return out[:6]


# Posts are short pitches: the composer allows a 400-char description plus
# three optional 200-char details; this is the composed body's ceiling.
TITLE_MAX = 80
BODY_MAX = 1100


class IdeaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=TITLE_MAX)
    body: str = Field(min_length=1, max_length=BODY_MAX)
    category: str = Field(default="General", max_length=80)
    visibility: str = Field(default="public", pattern="^(public|private)$")
    project_url: str | None = Field(default=None, max_length=500)
    looking_for: list[str] | None = None

    _url = field_validator("project_url")(_clean_project_url)
    _roles = field_validator("looking_for")(_clean_roles)


class IdeaUpdate(BaseModel):
    """Partial update by the author; omitted fields are left unchanged.
    Send project_url as "" or null to remove the link."""

    # Length limits for edits are checked in the route, so older long posts
    # can still be edited without touching their text.
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, max_length=80)
    visibility: str | None = Field(default=None, pattern="^(public|private)$")
    project_url: str | None = Field(default=None, max_length=500)
    looking_for: list[str] | None = None

    _url = field_validator("project_url")(_clean_project_url)
    _roles = field_validator("looking_for")(_clean_roles)


class IdeaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    category: str
    visibility: str
    project_url: str | None = None
    looking_for: list[str] = []
    team_closed: bool = False
    created_at: datetime
    updated_at: datetime
    author: UserPublic

    # Aggregates / per-viewer state (populated in the route layer)
    upvote_count: int = 0
    comment_count: int = 0
    saved_by_me: bool = False
    upvoted_by_me: bool = False
    member_count: int = 0
    # First few team members (owner first), for the card's avatars.
    member_preview: list[UserPublic] = []
    # none | pending | member | owner
    join_status: str = "none"

    @field_validator("looking_for", mode="before")
    @classmethod
    def _roles_default(cls, v: list[str] | None) -> list[str]:
        return v or []


class IdeaListResponse(BaseModel):
    items: list[IdeaOut]
    total: int
    page: int
    page_size: int


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    # Reply to this comment (a reply to a reply joins the same thread).
    parent_id: int | None = None


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    created_at: datetime
    parent_id: int | None = None
    author: UserPublic
