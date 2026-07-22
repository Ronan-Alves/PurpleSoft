"""add admission workflow steps

Revision ID: 20260717_0011
Revises: 20260717_0010
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0011"
down_revision: str | None = "20260717_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("admission_workflow_steps"):
        return
    op.create_table("admission_workflow_steps", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("step_key", sa.String(40), nullable=False), sa.Column("status", sa.String(30), nullable=False, server_default="locked"), sa.Column("assignee", sa.String(120)), sa.Column("completed_at", sa.String(40)))
    op.create_index("ix_admission_workflow_steps_task_id", "admission_workflow_steps", ["task_id"])
    op.create_unique_constraint("uq_admission_workflow_task_step", "admission_workflow_steps", ["task_id", "step_key"])

def downgrade() -> None:
    op.drop_table("admission_workflow_steps")
