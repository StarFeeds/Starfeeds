"""admin fields: users.is_admin, users.is_active, ideas.hidden

Revision ID: c3d2b1a0e8f7
Revises: b2c1a0f4e7d9
Create Date: 2026-07-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d2b1a0e8f7"
down_revision: Union[str, None] = "b2c1a0f4e7d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "ideas",
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("ideas", "hidden")
    op.drop_column("users", "is_active")
    op.drop_column("users", "is_admin")
