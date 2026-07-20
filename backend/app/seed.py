from sqlalchemy.orm import Session

from .models import Customer, CustomerServiceInterest, Employee, Office, Task, WorkArea


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

PERSONNEL_FACTORY_TASKS = [
    ("Admissao de colaborador", "Grupo Litoral", "waiting_release", "admissoes", "2026-07-08", False, "critica", None),
    ("Admissao de colaborador", "Aurora Alimentos", "pending", "admissoes", "2026-07-12", True, "alta", "Ana Souza"),
    ("Admissao de colaborador", "Prisma Tech", "running", "admissoes", "2026-07-15", True, "normal", "Camila Rocha"),
    ("Rescisao contratual", "Rota Sul", "waiting_release", "rescisoes", "2026-07-07", False, "critica", None),
    ("Rescisao contratual", "Pedra Alta", "pending", "rescisoes", "2026-07-11", True, "alta", "Bruno Lima"),
    ("Rescisao contratual", "Bem Viver", "done_waiting", "rescisoes", "2026-07-14", True, "normal", "Bruno Lima"),
    ("Calculo de ferias", "Moveis Nobre", "pending", "ferias", "2026-07-09", True, "alta", "Diego Martins"),
    ("Calculo de ferias", "Educa Mais", "waiting_release", "ferias", "2026-07-13", False, "normal", None),
    ("Calculo de ferias", "Sabor da Serra", "done_waiting", "ferias", "2026-07-16", True, "normal", "Diego Martins"),
    ("Processamento da folha", "Alpha Engenharia", "running", "folha", "2026-07-06", True, "critica", "Camila Rocha"),
    ("Processamento da folha", "Orbita Sistemas", "waiting_release", "folha", "2026-07-10", False, "alta", None),
    ("Processamento da folha", "Mercado Boa Compra", "done_waiting", "folha", "2026-07-15", True, "normal", "Ana Souza"),
]

ACCOUNTING_FACTORY_TASKS = [
    ("Folha contabil mensal", "Aurora Alimentos", "pending", "critica", "Ana Souza"),
    ("Folha contabil mensal", "Prisma Tech", "running", "alta", "Bruno Lima"),
    ("Folha contabil mensal", "Verde Campo", "done", "normal", "Ana Souza"),
    ("Folha contabil mensal", "Horizonte", "pending", "alta", None),
    ("Folha contabil mensal", "Bem Viver", "done", "normal", "Bruno Lima"),
    ("Folha contabil mensal", "Rota Sul", "blocked", "critica", None),
    ("Folha contabil mensal", "Santa Luzia Agro", "running", "alta", "Camila Rocha"),
    ("Folha contabil mensal", "Ponto Certo", "done", "normal", "Camila Rocha"),
    ("Folha contabil mensal", "Pedra Alta", "pending", "normal", None),
    ("Folha contabil mensal", "Educa Mais", "done", "baixa", "Diego Martins"),
    ("Folha contabil mensal", "Brava Digital", "pending", "alta", "Diego Martins"),
    ("Folha contabil mensal", "Boa Compra", "done", "normal", "Diego Martins"),
    ("Folha contabil mensal", "Moveis Nobre", "pending", "critica", None),
    ("Folha contabil mensal", "Sabor da Serra", "running", "alta", "Ana Souza"),
    ("Folha contabil mensal", "Orbita Sistemas", "pending", "normal", "Bruno Lima"),
    ("Folha contabil mensal", "Central Express", "done", "normal", "Bruno Lima"),
    ("Folha contabil mensal", "Alpha Engenharia", "blocked", "critica", "Camila Rocha"),
    ("Folha contabil mensal", "Doces da Vila", "pending", "alta", None),
    ("Folha contabil mensal", "Grupo Litoral", "running", "critica", "Ana Souza"),
    ("Folha contabil mensal", "Novo Caminho", "done", "normal", "Camila Rocha"),
]

EMPLOYEES = [
    ("employee-ana-souza", "Ana Souza", "pessoal"),
    ("employee-bruno-lima", "Bruno Lima", "pessoal"),
    ("employee-camila-rocha", "Camila Rocha", "pessoal"),
    ("employee-diego-martins", "Diego Martins", "contabil"),
]

DEMO_OFFICES = [
    ("office-demo-1", "Escritorio Alfa Contabil"),
    ("office-demo-2", "Martins & Rocha Consultoria"),
    ("office-demo-3", "Solucoes Contabeis Horizonte"),
    ("office-demo-4", "Prime Gestão Empresarial"),
    ("office-demo-5", "Crescer Assessoria Contabil"),
    ("office-demo-6", "Nova Era Consultoria"),
    ("office-demo-7", "Vetor BPO e Contabilidade"),
    ("office-demo-8", "Integra Escritorios Associados"),
]

DEMO_CUSTOMERS = [
    ("customer-demo-1", "office-demo-1", "Aurora Comercio de Alimentos Ltda", "12.345.678/0001-90", "Aurora Alimentos", ["contabil", "pessoal"]),
    ("customer-demo-2", "office-demo-1", "Prisma Tecnologia e Servicos Ltda", "22.987.654/0001-10", "Prisma Tech", ["pessoal"]),
    ("customer-demo-3", "office-demo-1", "Verde Campo Produtos Naturais Ltda", "41.208.763/0001-05", "Verde Campo", ["contabil"]),
    ("customer-demo-4", "office-demo-2", "Horizonte Transportes Ltda", "33.222.111/0001-44", "Horizonte", ["contabil"]),
    ("customer-demo-5", "office-demo-2", "Clinica Bem Viver Ltda", "18.524.936/0001-64", "Bem Viver", ["pessoal"]),
    ("customer-demo-6", "office-demo-2", "Rota Sul Logistica Integrada Ltda", "56.843.192/0001-83", "Rota Sul", ["contabil", "pessoal"]),
    ("customer-demo-7", "office-demo-3", "Agropecuaria Santa Luzia Ltda", "74.156.239/0001-47", "Santa Luzia Agro", ["contabil", "pessoal"]),
    ("customer-demo-8", "office-demo-3", "Ponto Certo Comercio de Roupas Ltda", "35.902.671/0001-09", "Ponto Certo", ["contabil"]),
    ("customer-demo-9", "office-demo-3", "Construtora Pedra Alta Ltda", "63.218.457/0001-76", "Pedra Alta", ["pessoal"]),
    ("customer-demo-10", "office-demo-4", "Educa Mais Cursos Livres Ltda", "15.847.320/0001-38", "Educa Mais", ["contabil", "pessoal"]),
    ("customer-demo-11", "office-demo-4", "Brava Comunicacao Digital Ltda", "48.391.625/0001-91", "Brava Digital", ["contabil"]),
    ("customer-demo-12", "office-demo-4", "Mercado Boa Compra Ltda", "26.735.184/0001-52", "Boa Compra", ["contabil", "pessoal"]),
    ("customer-demo-13", "office-demo-5", "Fabrica de Moveis Nobre Ltda", "59.124.867/0001-36", "Moveis Nobre", ["contabil"]),
    ("customer-demo-14", "office-demo-5", "Sabor da Serra Restaurante Ltda", "32.680.419/0001-75", "Sabor da Serra", ["contabil", "pessoal"]),
    ("customer-demo-15", "office-demo-6", "Orbita Sistemas Empresariais Ltda", "71.493.208/0001-62", "Orbita Sistemas", ["pessoal"]),
    ("customer-demo-16", "office-demo-6", "Lavanderia Central Express Ltda", "24.518.697/0001-14", "Central Express", ["contabil"]),
    ("customer-demo-17", "office-demo-7", "Alpha Servicos de Engenharia Ltda", "46.702.831/0001-40", "Alpha Engenharia", ["contabil", "pessoal"]),
    ("customer-demo-18", "office-demo-7", "Doces da Vila Industria Ltda", "19.865.204/0001-87", "Doces da Vila", ["outro"]),
    ("customer-demo-19", "office-demo-8", "Grupo Litoral Comercio e Servicos Ltda", "68.247.915/0001-23", "Grupo Litoral", ["contabil"]),
    ("customer-demo-20", "office-demo-8", "Instituto Novo Caminho Ltda", "37.591.426/0001-68", "Novo Caminho", ["pessoal"]),
]


def seed_database(db: Session) -> None:
    if not db.query(WorkArea).first():
        db.add_all(
            WorkArea(id=id_, name=name, kind=kind, status=status, position_x=x, position_y=y, wip=wip, pending=pending, priority=priority)
            for id_, name, kind, status, x, y, wip, pending, priority in AREAS
        )
        db.flush()
        db.add_all(Task(title=title, client_name=client, status=status, area_id=area) for title, client, status, area in TASKS)

    if not db.query(Office).first():
        db.add_all(Office(id=id_, name=name) for id_, name in DEMO_OFFICES)
        db.flush()
        for customer_id, office_id, legal_name, cnpj, trade_name, services in DEMO_CUSTOMERS:
            customer = Customer(id=customer_id, office_id=office_id, legal_name=legal_name, cnpj=cnpj, trade_name=trade_name)
            customer.service_interests = [CustomerServiceInterest(service_type=service) for service in services]
            db.add(customer)

    if not db.query(Employee).first():
        db.add_all(Employee(id=id_, name=name, area_id=area_id) for id_, name, area_id in EMPLOYEES)

    for title, client, status, station_id, requested_at, checklist_ready, priority, assignee in PERSONNEL_FACTORY_TASKS:
        task = db.query(Task).filter(Task.area_id == "pessoal", Task.client_name == client, Task.station_id == station_id).first()
        if not task:
            task = Task(title=title, client_name=client, status=status, area_id="pessoal")
            db.add(task)
        task.title = title
        task.status = status
        task.station_id = station_id
        task.requested_at = requested_at
        task.checklist_ready = checklist_ready
        task.priority = priority
        task.assignee = assignee
    existing_accounting_clients = {client for (client,) in db.query(Task.client_name).filter(Task.area_id == "contabil", Task.title == "Folha contabil mensal").all()}
    db.add_all(
        Task(title=title, client_name=client, status=status, area_id="contabil", priority=priority, assignee=assignee)
        for title, client, status, priority, assignee in ACCOUNTING_FACTORY_TASKS
        if client not in existing_accounting_clients
    )

    db.flush()
    for task in db.query(Task).filter(Task.task_code.is_(None)).all():
        task.task_code = f"T-{task.id:06d}"
    db.commit()
