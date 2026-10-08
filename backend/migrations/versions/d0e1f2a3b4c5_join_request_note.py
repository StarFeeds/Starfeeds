"""collaboration_requests.message (note from the requester) + reminded_at

Revision ID: d0e1f2a3b4c5
Revises: c9d8e7f6a5b4
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("collaboration_requests", sa.Column("message", sa.Text(), nullable=True))
    op.add_column(
        "collaboration_requests", sa.Column("reminded_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("collaboration_requests", "reminded_at")
    op.drop_column("collaboration_requests", "message")
