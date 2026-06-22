from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))

    headline: Mapped[str] = mapped_column(String(120), default="Entrepreneur")
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_online: Mapped[bool] = mapped_column(default=False)

    ideas: Mapped[list["Idea"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )
    upvotes: Mapped[list["Upvote"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    saved: Mapped[list["SavedIdea"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


from app.models.idea import Idea, SavedIdea, Upvote  # noqa: E402
