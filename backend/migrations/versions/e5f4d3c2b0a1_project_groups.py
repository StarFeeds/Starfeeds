"""project groups: group_members, group_messages (+ backfill authors)

Revision ID: e5f4d3c2b0a1
Revises: d4e3c2b1a9f8
Create Date: 2026-08-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f4d3c2b0a1"
down_revision: Union[str, None] = "d4e3c2b1a9f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("idea_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["idea_id"], ["ideas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idea_id", "user_id", name="uq_group_member"),
    )
    op.create_index("ix_group_members_idea_id", "group_members", ["idea_id"])
    op.create_index("ix_group_members_user_id", "group_members", ["user_id"])

    op.create_table(
        "group_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("idea_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["idea_id"], ["ideas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_group_messages_idea_id", "group_messages", ["idea_id"])
    op.create_index("ix_group_messages_sender_id", "group_messages", ["sender_id"])

    # Backfill: every existing project's author becomes a member of its group.
    op.execute(
        "INSERT INTO group_members (idea_id, user_id, created_at, updated_at) "
        "SELECT id, author_id, now(), now() FROM ideas"
    )


def downgrade() -> None:
    op.drop_index("ix_group_messages_sender_id", table_name="group_messages")
    op.drop_index("ix_group_messages_idea_id", table_name="group_messages")
    op.drop_table("group_messages")
    op.drop_index("ix_group_members_user_id", table_name="group_members")
    op.drop_index("ix_group_members_idea_id", table_name="group_members")
    op.drop_table("group_members")
