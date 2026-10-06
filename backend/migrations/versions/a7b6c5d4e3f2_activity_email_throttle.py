"""users.last_activity_email_at: throttle for activity emails

Revision ID: a7b6c5d4e3f2
Revises: f6a5e4d3c2b1
Create Date: 2026-10-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a7b6c5d4e3f2"
down_revision: Union[str, None] = "f6a5e4d3c2b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("last_activity_email_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "last_activity_email_at")
