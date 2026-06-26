"""client portal tables

Revision ID: 20260623_0002
Revises: 20260623_0001
Create Date: 2026-06-23
"""

from collections.abc import Sequence

from alembic import op

from app.database import Base
import app.models  # noqa: F401

revision: str = "20260623_0002"
down_revision: str | None = "20260623_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    op.drop_table("client_pendings", if_exists=True)
    op.drop_table("client_accesses", if_exists=True)
