"""task assignment and priority

Revision ID: 20260717_0005
Revises: 20260623_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0005"
down_revision: str | None = "20260623_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("priority", sa.String(20), nullable=False, server_default="normal"))
    op.add_column("tasks", sa.Column("assignee", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "assignee")
    op.drop_column("tasks", "priority")
