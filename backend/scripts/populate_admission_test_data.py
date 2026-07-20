"""Cria e valida uma massa de teste para as esteiras do Departamento Pessoal.

Execute a partir da pasta backend:
    .venv/bin/python scripts/populate_admission_test_data.py

A rotina é idempotente: ela remove apenas os registros criados por ela mesma
e recria a mesma massa para a demonstração.
"""

from datetime import date, timedelta
from pathlib import Path
import sys

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import Customer, CustomerServiceInterest, Employee, Task


MARKER = "[rotina-teste-dp]"
ADMISSION_EMPLOYEES = [
    "Mariana Costa", "João Victor Alves", "Luana Ferreira", "Carlos Eduardo Lima",
    "Beatriz Nunes", "Rafael Moreira", "Isabela Martins", "Pedro Henrique Souza",
    "Gabriela Rocha", "Thiago Oliveira", "Camila Azevedo", "Felipe Santos",
    "Ana Clara Ribeiro", "Matheus Gomes", "Renata Barros", "Diego Freitas",
]
OTHER_REQUESTS = [
    ("rescisoes", "Rescisao contratual", "Eduardo Cardoso"),
    ("rescisoes", "Rescisao contratual", "Patrícia Mendes"),
    ("rescisoes", "Rescisao contratual", "Lucas Araújo"),
    ("rescisoes", "Rescisao contratual", "Fernanda Reis"),
    ("ferias", "Calculo de ferias", "Ricardo Melo"),
    ("ferias", "Calculo de ferias", "Juliana Pires"),
    ("ferias", "Calculo de ferias", "André Farias"),
    ("ferias", "Calculo de ferias", "Vanessa Castro"),
]


def task_status(index: int) -> tuple[str, bool]:
    statuses = [("waiting_release", False), ("pending", True), ("running", True), ("done", True)]
    return statuses[index % len(statuses)]


def run() -> None:
    db = SessionLocal()
    try:
        customers = db.scalars(
            select(Customer)
            .join(CustomerServiceInterest)
            .where(CustomerServiceInterest.service_type == "pessoal")
            .order_by(Customer.trade_name, Customer.legal_name)
        ).all()
        if not customers:
            raise RuntimeError("Não há empresas com serviço de Departamento Pessoal para criar a massa de teste.")

        assignees = db.scalars(select(Employee.name).where(Employee.area_id == "pessoal", Employee.active.is_(True))).all()
        if not assignees:
            raise RuntimeError("Não há colaboradores ativos no Departamento Pessoal.")

        db.query(Task).filter(Task.request_notes == MARKER).delete(synchronize_session=False)
        db.flush()

        created: list[Task] = []
        today = date.today()
        source = [("admissoes", "Admissao de colaborador", employee) for employee in ADMISSION_EMPLOYEES] + OTHER_REQUESTS
        priorities = ["critica", "alta", "normal", "baixa"]
        for index, (station_id, title, employee_name) in enumerate(source):
            customer = customers[index % len(customers)]
            status, checklist_ready = task_status(index)
            task = Task(
                title=title,
                client_name=customer.trade_name or customer.legal_name,
                status=status,
                area_id="pessoal",
                priority=priorities[index % len(priorities)],
                assignee=None if status == "waiting_release" else assignees[index % len(assignees)],
                station_id=station_id,
                requested_at=(today - timedelta(days=index % 9)).isoformat(),
                checklist_ready=checklist_ready,
                customer_id=customer.id,
                employee_name=employee_name,
                request_notes=MARKER,
            )
            db.add(task)
            created.append(task)

        db.flush()
        for task in created:
            task.task_code = f"T-{task.id:06d}"
        db.commit()

        created_ids = [task.id for task in created]
        persisted = db.scalars(select(Task).where(Task.id.in_(created_ids))).all()
        codes = [task.task_code for task in persisted]
        assert len(persisted) == len(source), "Nem todas as tarefas de teste foram persistidas."
        assert len(codes) == len(set(codes)) and all(codes), "Os códigos das tarefas não são únicos."
        assert all(task.area_id == "pessoal" for task in persisted), "Uma tarefa foi criada fora do setor correto."
        assert all(task.station_id in {"admissoes", "rescisoes", "ferias"} for task in persisted), "Uma tarefa foi criada em esteira inválida."
        assert all(task.customer_id for task in persisted), "Uma tarefa ficou sem empresa vinculada."
        assert sum(task.station_id == "admissoes" for task in persisted) == len(ADMISSION_EMPLOYEES), "Quantidade de admissões inesperada."

        print(f"OK: {len(persisted)} solicitações criadas e validadas ({len(ADMISSION_EMPLOYEES)} admissões).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
