"""accounting client companies

Revision ID: 20260623_0003
Revises: 20260623_0002
Create Date: 2026-06-23
"""

from collections.abc import Sequence

from alembic import op

from app.database import Base
import app.models  # noqa: F401

revision: str = "20260623_0003"
down_revision: str | None = "20260623_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    op.drop_table("accounting_client_companies", if_exists=True)
