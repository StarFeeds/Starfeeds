"""ideas.project_url: optional link to the live project

Revision ID: f6a5e4d3c2b1
Revises: e5f4d3c2b0a1
Create Date: 2026-10-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f6a5e4d3c2b1"
down_revision: Union[str, None] = "e5f4d3c2b0a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ideas", sa.Column("project_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("ideas", "project_url")
