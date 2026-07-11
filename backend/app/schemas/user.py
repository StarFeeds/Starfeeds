from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=1, max_length=120)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    # WhatsApp / contact number (optional at signup).
    phone: str | None = Field(default=None, max_length=40)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    headline: str
    bio: str | None = None
    avatar_url: str | None = None
    is_online: bool


class UserMe(UserPublic):
    email: EmailStr
    phone: str | None = None
    created_at: datetime
    notification_prefs: dict = {}
    is_admin: bool = False
    is_active: bool = True


class UserUpdate(BaseModel):
    """Partial profile/account update — every field is optional."""

    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    headline: str | None = Field(default=None, max_length=120)
    bio: str | None = None
    avatar_url: str | None = None  # may be a long data: URL
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)


class NotificationPrefsUpdate(BaseModel):
    """Notification / visibility preference toggles (all optional)."""

    comments: bool | None = None
    collab: bool | None = None
    mentions: bool | None = None
    announcements: bool | None = None
    weekly: bool | None = None
    important: bool | None = None
    public_profile: bool | None = None
    show_online: bool | None = None
