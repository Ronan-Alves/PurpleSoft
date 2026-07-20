"""personnel request details

Revision ID: 20260717_0008
Revises: 20260717_0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0008"
down_revision: str | None = "20260717_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("customer_id", sa.String(64), nullable=True))
    op.add_column("tasks", sa.Column("employee_name", sa.String(160), nullable=True))
    op.add_column("tasks", sa.Column("request_notes", sa.Text(), nullable=True))
    op.create_foreign_key("fk_tasks_customer_id", "tasks", "customers", ["customer_id"], ["id"])
    op.create_index("ix_tasks_customer_id", "tasks", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_customer_id", table_name="tasks")
    op.drop_constraint("fk_tasks_customer_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "request_notes")
    op.drop_column("tasks", "employee_name")
    op.drop_column("tasks", "customer_id")
