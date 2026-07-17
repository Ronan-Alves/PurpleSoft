"""personnel settings

Revision ID: 20260717_0007
Revises: 20260717_0006
"""

from collections.abc import Sequence

from alembic import op

from app.database import Base
import app.models  # noqa: F401

revision: str = "20260717_0007"
down_revision: str | None = "20260717_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    op.drop_table("personnel_settings", if_exists=True)
