"""users.signup_source / referred_by_id (where members came from)

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("signup_source", sa.String(60), nullable=True))
    op.add_column(
        "users",
        sa.Column("referred_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_users_signup_source", "users", ["signup_source"])
    op.create_index("ix_users_referred_by_id", "users", ["referred_by_id"])


def downgrade() -> None:
    op.drop_index("ix_users_referred_by_id", table_name="users")
    op.drop_index("ix_users_signup_source", table_name="users")
    op.drop_column("users", "referred_by_id")
    op.drop_column("users", "signup_source")
