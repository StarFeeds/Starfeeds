"""users.last_digest_at: makes the weekly digest idempotent

Revision ID: b8c7d6e5f4a3
Revises: a7b6c5d4e3f2
Create Date: 2026-10-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b8c7d6e5f4a3"
down_revision: Union[str, None] = "a7b6c5d4e3f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_digest_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_digest_at")
