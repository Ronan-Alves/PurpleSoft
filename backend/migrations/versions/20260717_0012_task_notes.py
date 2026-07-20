"""add task notes

Revision ID: 20260717_0012
Revises: 20260717_0011
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0012"
down_revision: str | None = "20260717_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table("task_notes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("author", sa.String(160), nullable=False), sa.Column("created_at", sa.String(40), nullable=False), sa.Column("updated_at", sa.String(40)))
    op.create_index("ix_task_notes_task_id", "task_notes", ["task_id"])

def downgrade() -> None:
    op.drop_table("task_notes")
