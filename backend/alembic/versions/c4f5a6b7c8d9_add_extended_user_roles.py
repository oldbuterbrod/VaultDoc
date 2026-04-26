"""add extended user roles

Revision ID: c4f5a6b7c8d9
Revises: 8f9a1c2d3e4f
Create Date: 2026-04-25 21:30:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "8f9a1c2d3e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'security_admin'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer'")


def downgrade() -> None:
    # PostgreSQL не умеет безопасно удалять enum-значения без пересоздания типа.
    pass
