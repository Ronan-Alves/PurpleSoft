"""add globally unique task code

Revision ID: 20260717_0009
Revises: 20260717_0008
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0009"
down_revision: str | None = "20260717_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("task_code", sa.String(24), nullable=True))
    op.execute("UPDATE tasks SET task_code = 'T-' || LPAD(id::text, 6, '0') WHERE task_code IS NULL")
    op.create_index("ix_tasks_task_code", "tasks", ["task_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_tasks_task_code", table_name="tasks")
    op.drop_column("tasks", "task_code")
