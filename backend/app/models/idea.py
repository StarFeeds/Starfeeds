from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Idea(Base, TimestampMixin):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80), default="General", index=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    # Admin-moderation: hidden ideas are excluded from public feed & search.
    hidden: Mapped[bool] = mapped_column(default=False, server_default=sa.false())

    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    author: Mapped["User"] = relationship(back_populates="ideas")

    upvotes: Mapped[list["Upvote"]] = relationship(
        back_populates="idea", cascade="all, delete-orphan"
    )
    saves: Mapped[list["SavedIdea"]] = relationship(
        back_populates="idea", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="idea", cascade="all, delete-orphan"
    )


class Upvote(Base):
    __tablename__ = "upvotes"
    __table_args__ = (UniqueConstraint("user_id", "idea_id", name="uq_upvote"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    idea_id: Mapped[int] = mapped_column(
        ForeignKey("ideas.id", ondelete="CASCADE"), index=True
    )

    user: Mapped["User"] = relationship(back_populates="upvotes")
    idea: Mapped["Idea"] = relationship(back_populates="upvotes")


class SavedIdea(Base):
    __tablename__ = "saved_ideas"
    __table_args__ = (UniqueConstraint("user_id", "idea_id", name="uq_saved"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    idea_id: Mapped[int] = mapped_column(
        ForeignKey("ideas.id", ondelete="CASCADE"), index=True
    )

    user: Mapped["User"] = relationship(back_populates="saved")
    idea: Mapped["Idea"] = relationship(back_populates="saves")


class Comment(Base, TimestampMixin):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    body: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    idea_id: Mapped[int] = mapped_column(
        ForeignKey("ideas.id", ondelete="CASCADE"), index=True
    )

    author: Mapped["User"] = relationship(back_populates="comments")
    idea: Mapped["Idea"] = relationship(back_populates="comments")
