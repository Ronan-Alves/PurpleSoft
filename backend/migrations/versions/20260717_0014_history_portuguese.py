"""translate admission history labels

Revision ID: 20260717_0014
Revises: 20260717_0013
"""
from collections.abc import Sequence
from alembic import op

revision: str = "20260717_0014"
down_revision: str | None = "20260717_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    for source, target in {"conference": "Conferência", "registration": "Cadastro", "esocial": "eSocial", "contracts": "Contratos", "communication": "Comunicação"}.items():
        op.execute(f"UPDATE task_events SET message = REPLACE(message, '{source}', '{target}')")

def downgrade() -> None:
    pass
