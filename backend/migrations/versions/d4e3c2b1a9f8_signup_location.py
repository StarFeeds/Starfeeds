"""signup metadata: users.signup_ip, users.signup_location

Revision ID: d4e3c2b1a9f8
Revises: c3d2b1a0e8f7
Create Date: 2026-07-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e3c2b1a9f8"
down_revision: Union[str, None] = "c3d2b1a0e8f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("signup_ip", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("signup_location", sa.String(length=160), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "signup_location")
    op.drop_column("users", "signup_ip")
