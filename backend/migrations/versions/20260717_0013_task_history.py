"""add task history and workflow release date

Revision ID: 20260717_0013
Revises: 20260717_0012
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0013"
down_revision: str | None = "20260717_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    workflow_columns = {column["name"] for column in inspector.get_columns("admission_workflow_steps")}
    if "released_at" not in workflow_columns:
        op.add_column("admission_workflow_steps", sa.Column("released_at", sa.String(40)))
    if not inspector.has_table("task_events"):
        op.create_table("task_events", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("message", sa.String(500), nullable=False), sa.Column("occurred_at", sa.String(40), nullable=False))
        op.create_index("ix_task_events_task_id", "task_events", ["task_id"])

def downgrade() -> None:
    op.drop_table("task_events")
    op.drop_column("admission_workflow_steps", "released_at")
