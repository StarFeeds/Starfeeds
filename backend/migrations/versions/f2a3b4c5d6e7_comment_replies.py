"""comments.parent_id: replies to comments (one level of threading)

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("comments", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_comments_parent_id", "comments", "comments", ["parent_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_comments_parent_id", "comments", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_parent_id", table_name="comments")
    op.drop_constraint("fk_comments_parent_id", "comments", type_="foreignkey")
    op.drop_column("comments", "parent_id")
