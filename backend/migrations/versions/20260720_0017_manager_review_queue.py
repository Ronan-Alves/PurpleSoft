"""move completed admissions to manager review

Revision ID: 20260720_0017
Revises: 20260720_0016
"""
from collections.abc import Sequence

from alembic import op

revision: str = "20260720_0017"
down_revision: str | None = "20260720_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        UPDATE tasks
        SET status = 'manager_review'
        WHERE area_id = 'pessoal'
          AND station_id = 'admissoes'
          AND status <> 'done'
          AND (SELECT COUNT(*) FROM admission_workflow_steps steps WHERE steps.task_id = tasks.id AND steps.status = 'done') = 5
    """)


def downgrade() -> None:
    op.execute("UPDATE tasks SET status = 'pending' WHERE status = 'manager_review'")
