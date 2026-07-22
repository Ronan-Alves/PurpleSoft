"""store factory layout in database

Revision ID: 20260717_0015
Revises: 20260717_0014
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260717_0015"
down_revision: str | None = "20260717_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("factory_layouts"):
        return
    op.create_table("factory_layouts", sa.Column("id", sa.String(40), primary_key=True), sa.Column("layout", sa.Text(), nullable=False), sa.Column("sockets", sa.Text(), nullable=False), sa.Column("updated_at", sa.String(40), nullable=False), sa.Column("updated_by", sa.String(160), nullable=False))

def downgrade() -> None:
    op.drop_table("factory_layouts")
