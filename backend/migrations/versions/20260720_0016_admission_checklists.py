"""persist admission checklist data and attachments

Revision ID: 20260720_0016
Revises: 20260717_0015
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0016"
down_revision: str | None = "20260717_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("admission_checklists"):
        op.create_table(
            "admission_checklists",
            sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), primary_key=True),
            sa.Column("form_data", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("released", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("updated_at", sa.String(40), nullable=False),
        )
    if not inspector.has_table("admission_attachments"):
        op.create_table(
            "admission_attachments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False),
            sa.Column("document_key", sa.String(80), nullable=False),
            sa.Column("file_name", sa.String(255), nullable=False),
            sa.Column("content_type", sa.String(120), nullable=False, server_default="application/octet-stream"),
            sa.Column("content", sa.LargeBinary(), nullable=False),
            sa.Column("updated_at", sa.String(40), nullable=False),
            sa.UniqueConstraint("task_id", "document_key", name="uq_admission_attachment_task_document"),
        )
        op.create_index("ix_admission_attachments_task_id", "admission_attachments", ["task_id"])


def downgrade() -> None:
    op.drop_index("ix_admission_attachments_task_id", table_name="admission_attachments")
    op.drop_table("admission_attachments")
    op.drop_table("admission_checklists")
