from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserPublic


class DailyCount(BaseModel):
    date: str
    count: int


class TopIdea(BaseModel):
    id: int
    title: str
    upvotes: int


class OnlineUser(BaseModel):
    id: int
    username: str
    full_name: str


class AdminStats(BaseModel):
    # Presence (live sockets) and recent activity (users.last_seen_at).
    online_now: int = 0
    online_users: list[OnlineUser] = []
    active_today: int = 0
    active_7d: int = 0
    users_total: int
    users_active: int
    users_admin: int
    ideas_total: int
    ideas_hidden: int
    comments_total: int
    collab_pending: int
    conversations_total: int
    messages_total: int
    signups_today: int
    signups_7d: int
    signups_30d: int
    signups_by_day: list[DailyCount]
    top_ideas: list[TopIdea]


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    username: str
    full_name: str
    headline: str
    phone: str | None = None
    avatar_url: str | None = None
    is_admin: bool
    is_active: bool
    is_online: bool
    last_seen_at: datetime | None = None
    created_at: datetime
    signup_ip: str | None = None
    signup_location: str | None = None
    idea_count: int = 0


class AdminUserListResponse(BaseModel):
    items: list[AdminUserOut]
    total: int
    page: int
    page_size: int


class AdminUserUpdate(BaseModel):
    is_admin: bool | None = None
    is_active: bool | None = None


class AdminIdeaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    hidden: bool
    created_at: datetime
    author: UserPublic
    upvote_count: int = 0
    comment_count: int = 0


class AdminIdeaListResponse(BaseModel):
    items: list[AdminIdeaOut]
    total: int
    page: int
    page_size: int


class AdminIdeaUpdate(BaseModel):
    hidden: bool


class AnnouncementCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    # Also email it (to users with announcements on). On by default.
    email: bool = True


class TeamFunnel(BaseModel):
    """Is LikeMinds turning sign-ups into teams? (see GET /admin/funnel)"""

    days: int
    signups: int
    # Of those sign-ups: posted an idea / asked to join one / did either.
    posted: int
    requested: int
    activated: int
    # Join requests sent in the window, and what happened to them.
    requests: int
    accepted: int
    declined: int
    pending: int
    pending_over_48h: int
    median_response_hours: float | None
    # Accepted requests where both people then posted in the project group.
    teams_active: int
    # "Come back" emails to inactive members in the window, and what happened.
    nudged: int = 0
    nudged_came_back: int = 0
    nudged_acted: int = 0
    # Accepted requests per week (oldest first), the north-star trend.
    teams_by_week: list[DailyCount]
