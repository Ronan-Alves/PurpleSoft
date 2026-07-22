"""add employees bound to departments

Revision ID: 20260717_0010
Revises: 20260717_0009
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0010"
down_revision: str | None = "20260717_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("employees"):
        return
    op.create_table(
        "employees",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False, unique=True),
        sa.Column("area_id", sa.String(64), sa.ForeignKey("work_areas.id"), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_employees_area_id", "employees", ["area_id"])


def downgrade() -> None:
    op.drop_index("ix_employees_area_id", table_name="employees")
    op.drop_table("employees")
