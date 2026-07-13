from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

DEFAULT_NOTIFICATION_PREFS: dict[str, bool] = {
    "comments": True,
    "collab": True,
    "mentions": False,
    "announcements": True,
    "weekly": True,
    "important": True,
    "public_profile": True,
    "show_online": True,
}


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))

    headline: Mapped[str] = mapped_column(String(120), default="Innovator")
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Text (not String(500)) so it can hold a resized data: URL avatar.
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_online: Mapped[bool] = mapped_column(default=False)
    is_admin: Mapped[bool] = mapped_column(default=False, server_default=sa.false())
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true())

    notification_prefs: Mapped[dict] = mapped_column(
        JSON, default=lambda: dict(DEFAULT_NOTIFICATION_PREFS)
    )

    @property
    def show_online_status(self) -> bool:
        """Online status as OTHERS should see it — respects the show_online pref."""
        if not self.is_online:
            return False
        return bool((self.notification_prefs or {}).get("show_online", True))

    def wants_notification(self, notif_type: str) -> bool:
        """Whether this user wants a notification of the given type."""
        mapping = {"comment": "comments", "collab": "collab", "system": "announcements"}
        key = mapping.get(notif_type)
        if key is None:
            return True  # e.g. "upvote" has no toggle — always deliver
        return bool((self.notification_prefs or {}).get(key, True))

    ideas: Mapped[list["Idea"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )
    upvotes: Mapped[list["Upvote"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    saved: Mapped[list["SavedIdea"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )


from app.models.idea import Comment, Idea, SavedIdea, Upvote  # noqa: E402,F401
