from sqlalchemy.orm import Session

from .models import Task, WorkArea


AREAS = [
    ("entrada", "Entrada da Demanda", "intake", "available", 9, 22, 12, 3, 0),
    ("cadastro", "Cadastro", "station", "running", 22, 23, 9, 2, 1),
    ("financeiro", "Financeiro", "station", "attention", 36, 23, 14, 5, 2),
    ("triagem", "Triagem", "station", "running", 50, 22, 18, 4, 1),
    ("contabil", "Departamento Contabil", "department", "running", 68, 22, 31, 8, 3),
    ("pessoal", "Departamento Pessoal", "department", "available", 66, 62, 24, 6, 1),
    ("consolidacao", "Consolidacao", "station", "running", 82, 49, 16, 2, 0),
    ("entrega", "Entrega Final", "delivery", "done", 93, 35, 7, 1, 0),
]

TASKS = [
    ("Fechamento contabil", "Escritorio Alfa", "running", "contabil"),
    ("Conciliacao bancaria", "Cliente Aurora", "blocked", "contabil"),
    ("Admissao mensal", "Cliente Prisma", "running", "pessoal"),
    ("Folha de pagamento", "Escritorio Beta", "attention", "pessoal"),
    ("Documentos pendentes", "Cliente Horizonte", "pending", "financeiro"),
    ("Entrega de relatorio", "Cliente Viva", "done", "entrega"),
]


def seed_database(db: Session) -> None:
    if db.query(WorkArea).first():
        return

    db.add_all(
        WorkArea(
            id=id_,
            name=name,
            kind=kind,
            status=status,
            position_x=x,
            position_y=y,
            wip=wip,
            pending=pending,
            priority=priority,
        )
        for id_, name, kind, status, x, y, wip, pending, priority in AREAS
    )
    db.flush()
    db.add_all(Task(title=title, client_name=client, status=status, area_id=area) for title, client, status, area in TASKS)
    db.commit()
