"""Popula uma massa rica e idempotente para apresentações do Departamento Pessoal.

Execute a partir da pasta backend:
    .venv/bin/python scripts/populate_presentation_data.py

A rotina recria somente os registros identificados por MARKER.
"""

from datetime import date, datetime, time, timedelta, timezone
import json
from pathlib import Path
import sys

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import (
    AdmissionAttachment,
    AdmissionChecklist,
    AdmissionWorkflowStep,
    Customer,
    CustomerServiceInterest,
    Employee,
    Task,
    TaskEvent,
    TaskNote,
)


MARKER = "[demo-apresentacao-dp-v2]"
STATIONS = ["admissoes", "rescisoes", "ferias", "folha"]
STATION_TITLES = {
    "admissoes": "Admissão de colaborador",
    "rescisoes": "Rescisão contratual",
    "ferias": "Cálculo de férias",
    "folha": "Fechamento da folha de pagamento",
}
SLA_DAYS = {"admissoes": 1, "rescisoes": 2, "ferias": 3, "folha": 5}
ADMISSION_STEPS = ["conference", "registration", "esocial", "contracts", "communication"]
STEP_LABELS = {"conference": "Checklist", "registration": "Cadastro", "esocial": "eSocial", "contracts": "Contratos", "communication": "Comunicação"}
FIRST_NAMES = ["Alice", "Bruno", "Carolina", "Daniel", "Elisa", "Fernando", "Giovana", "Henrique", "Ingrid", "João", "Karen", "Leonardo", "Marina", "Nicolas", "Olívia", "Paulo", "Queila", "Rodrigo", "Sabrina", "Tiago", "Vitória", "Wesley"]
LAST_NAMES = ["Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Freitas", "Gonçalves", "Lima", "Martins", "Nogueira", "Oliveira", "Pereira", "Ramos", "Silva", "Teixeira"]
REQUIRED_DOCUMENTS = ["cpf", "identity", "voter", "aso", "address"]


def iso_at(day: date, hour: int = 16) -> str:
    return datetime.combine(day, time(hour=hour), tzinfo=timezone.utc).isoformat()


def employee_name(index: int) -> str:
    return f"{FIRST_NAMES[index % len(FIRST_NAMES)]} {LAST_NAMES[(index * 3) % len(LAST_NAMES)]}"


def admission_form(name: str, complete: bool) -> dict[str, str | bool]:
    base: dict[str, str | bool] = {
        "employee": name,
        "admissionDate": (date.today() + timedelta(days=2)).isoformat() if complete else "",
        "role": "Assistente administrativo" if complete else "",
        "salary": "R$ 2.850,00" if complete else "",
        "startTime": "08:00" if complete else "",
        "endTime": "17:30" if complete else "",
        "breakStart": "12:00" if complete else "",
        "breakEnd": "13:30" if complete else "",
        "weeklyRest": "Domingo" if complete else "",
        "weeklyRestOther": "",
        "phone": "(11) 98888-0000",
        "race": "Parda" if complete else "",
        "probation": "45 dias" if complete else "",
        "maritalStatus": "Solteiro" if complete else "",
        "reservistRequired": False,
        "driver": False,
        "childDependent": False,
        "email": f"{name.lower().replace(' ', '.')}@exemplo.com" if complete else "",
        "education": "Ensino médio completo" if complete else "",
        "overtime": "Compensadas" if complete else "",
        "transport": "Sim" if complete else "",
        "healthPlan": "Não" if complete else "",
        "specialNotes": "Registro fictício preparado para demonstração do fluxo.",
    }
    return base


def clear_previous(db) -> None:
    ids = list(db.scalars(select(Task.id).where(Task.request_notes == MARKER)).all())
    if not ids:
        return
    for model in (AdmissionAttachment, AdmissionChecklist, AdmissionWorkflowStep, TaskEvent, TaskNote):
        db.query(model).filter(model.task_id.in_(ids)).delete(synchronize_session=False)
    db.query(Task).filter(Task.id.in_(ids)).delete(synchronize_session=False)
    db.flush()


def add_admission_details(db, task: Task, stage_index: int | None, checklist_complete: bool, completed: bool) -> None:
    db.add(AdmissionChecklist(task_id=task.id, form_data=json.dumps(admission_form(task.employee_name or "Colaborador", checklist_complete), ensure_ascii=False), released=checklist_complete, updated_at=iso_at(date.today())))
    document_keys = REQUIRED_DOCUMENTS if checklist_complete else REQUIRED_DOCUMENTS[:2]
    for key in document_keys:
        db.add(AdmissionAttachment(task_id=task.id, document_key=key, file_name=f"{key}-{task.id}.txt", content_type="text/plain", content=f"Documento fictício de demonstração: {key}.".encode(), updated_at=iso_at(date.today())))

    requested = datetime.strptime(task.requested_at or date.today().isoformat(), "%Y-%m-%d").date()
    for index, step_key in enumerate(ADMISSION_STEPS):
        if completed or (stage_index is not None and index < stage_index):
            status = "done"
            released_at = iso_at(requested + timedelta(days=index), 9)
            completed_at = iso_at(requested + timedelta(days=index), 15)
        elif stage_index is not None and index == stage_index:
            status = "pending"
            released_at = iso_at(requested + timedelta(days=index), 9)
            completed_at = None
        elif index == 0 and not checklist_complete:
            status, released_at, completed_at = "waiting_release", None, None
        else:
            status, released_at, completed_at = "locked", None, None
        db.add(AdmissionWorkflowStep(task_id=task.id, step_key=step_key, status=status, assignee=task.assignee, released_at=released_at, completed_at=completed_at))
        if status == "done":
            db.add(TaskEvent(task_id=task.id, message=f"Etapa {STEP_LABELS[step_key]} concluída.", occurred_at=completed_at or iso_at(requested)))


def run() -> None:
    with SessionLocal() as db:
        customers = list(db.scalars(select(Customer).join(CustomerServiceInterest).where(CustomerServiceInterest.service_type == "pessoal").order_by(Customer.trade_name, Customer.legal_name)).all())
        assignees = list(db.scalars(select(Employee.name).where(Employee.area_id == "pessoal", Employee.active.is_(True)).order_by(Employee.name)).all())
        if not customers or not assignees:
            raise RuntimeError("Cadastre empresas de DP e colaboradores ativos antes de executar a massa de apresentação.")

        clear_previous(db)
        today = date.today()
        created: list[Task] = []

        # Histórico: 64 entregas distribuídas ao longo dos últimos 90 dias.
        for index in range(64):
            station_id = STATIONS[index % len(STATIONS)]
            requested = today - timedelta(days=3 + (index * 7) % 86)
            duration = SLA_DAYS[station_id] + (-1 if index % 5 in {0, 1, 2} else 2 + index % 4)
            duration = max(duration, 0)
            completed_day = min(requested + timedelta(days=duration), today - timedelta(days=index % 2))
            customer = customers[index % len(customers)]
            task = Task(title=STATION_TITLES[station_id], client_name=customer.trade_name or customer.legal_name, status="done", area_id="pessoal", priority=["normal", "alta", "normal", "critica", "baixa"][index % 5], assignee=assignees[index % len(assignees)], station_id=station_id, requested_at=requested.isoformat(), completed_at=iso_at(completed_day), checklist_ready=True, customer_id=customer.id, employee_name=employee_name(index), request_notes=MARKER)
            db.add(task)
            db.flush()
            task.task_code = f"T-{task.id:06d}"
            if station_id == "admissoes":
                add_admission_details(db, task, stage_index=None, checklist_complete=True, completed=True)
            db.add(TaskEvent(task_id=task.id, message=f"{STATION_TITLES[station_id]} concluída e arquivada.", occurred_at=task.completed_at or iso_at(completed_day)))
            created.append(task)

        # Operação atual: 36 demandas em diferentes condições, etapas e prazos.
        active_distribution = ["admissoes"] * 15 + ["rescisoes"] * 8 + ["ferias"] * 8 + ["folha"] * 5
        for index, station_id in enumerate(active_distribution):
            requested = today - timedelta(days=index % 13)
            checklist_complete = index % 5 != 0
            customer = customers[(index * 2 + 3) % len(customers)]
            task = Task(title=STATION_TITLES[station_id], client_name=customer.trade_name or customer.legal_name, status="pending" if checklist_complete else "waiting_release", area_id="pessoal", priority=["critica", "alta", "normal", "normal", "baixa"][index % 5], assignee=None if index % 7 == 0 else assignees[(index + 1) % len(assignees)], station_id=station_id, requested_at=requested.isoformat(), checklist_ready=checklist_complete, customer_id=customer.id, employee_name=employee_name(index + 70), request_notes=MARKER)
            db.add(task)
            db.flush()
            task.task_code = f"T-{task.id:06d}"
            if station_id == "admissoes":
                stage_index = None if not checklist_complete else 1 + index % 4
                add_admission_details(db, task, stage_index=stage_index, checklist_complete=checklist_complete, completed=False)
            db.add(TaskEvent(task_id=task.id, message="Demanda fictícia criada para apresentação.", occurred_at=iso_at(requested, 9)))
            created.append(task)

        db.commit()

        persisted = list(db.scalars(select(Task).where(Task.request_notes == MARKER)).all())
        assert len(persisted) == 100, f"Esperadas 100 tarefas, encontradas {len(persisted)}."
        assert len({task.task_code for task in persisted}) == 100
        assert sum(task.status == "done" for task in persisted) == 64
        assert sum(task.status != "done" for task in persisted) == 36
        print("OK: 100 tarefas de apresentação criadas: 64 concluídas e 36 ativas.")


if __name__ == "__main__":
    run()
