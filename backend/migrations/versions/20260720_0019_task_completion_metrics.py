"""track task completion for management metrics

Revision ID: 20260720_0019
Revises: 20260720_0018
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0019"
down_revision: str | None = "20260720_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("tasks")}
    if "completed_at" in columns:
        return
    op.add_column("tasks", sa.Column("completed_at", sa.String(40)))
    op.execute("""
        UPDATE tasks
        SET completed_at = COALESCE(
            (SELECT MAX(events.occurred_at) FROM task_events events WHERE events.task_id = tasks.id AND (events.message LIKE 'Etapa Comunicação concluída.%' OR events.message LIKE 'Admissão aprovada pelo gestor%')),
            CASE WHEN requested_at IS NOT NULL THEN requested_at || 'T18:00:00+00:00' ELSE NULL END
        )
        WHERE status IN ('done', 'manager_review')
    """)
    op.execute("UPDATE tasks SET status = 'done' WHERE status = 'manager_review'")


def downgrade() -> None:
    op.drop_column("tasks", "completed_at")
