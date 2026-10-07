"""ideas.looking_for: roles the author wants to recruit (developer, designer...)

Revision ID: c9d8e7f6a5b4
Revises: b8c7d6e5f4a3
Create Date: 2026-10-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, None] = "b8c7d6e5f4a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ideas", sa.Column("looking_for", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("ideas", "looking_for")
