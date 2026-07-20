"""add manuals uploaded by station users

Revision ID: 20260720_0018
Revises: 20260720_0017
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0018"
down_revision: str | None = "20260720_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "station_manuals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("station_key", sa.String(120), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False, server_default="application/octet-stream"),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("uploaded_at", sa.String(40), nullable=False),
        sa.Column("uploaded_by", sa.String(160), nullable=False),
    )
    op.create_index("ix_station_manuals_station_key", "station_manuals", ["station_key"])


def downgrade() -> None:
    op.drop_index("ix_station_manuals_station_key", table_name="station_manuals")
    op.drop_table("station_manuals")
