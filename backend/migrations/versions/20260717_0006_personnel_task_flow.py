"""personnel task flow

Revision ID: 20260717_0006
Revises: 20260717_0005
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0006"
down_revision: str | None = "20260717_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("station_id", sa.String(80), nullable=True))
    op.add_column("tasks", sa.Column("requested_at", sa.String(20), nullable=True))
    op.add_column("tasks", sa.Column("checklist_ready", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_tasks_station_id", "tasks", ["station_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_station_id", table_name="tasks")
    op.drop_column("tasks", "checklist_ready")
    op.drop_column("tasks", "requested_at")
    op.drop_column("tasks", "station_id")
