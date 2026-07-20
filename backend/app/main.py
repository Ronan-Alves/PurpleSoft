from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from secrets import token_urlsafe
from unicodedata import normalize
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse, Response
from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal, get_db
from .models import (
    AccountingClientCompany,
    AdmissionAttachment,
    AdmissionChecklist,
    AdmissionWorkflowStep,
    AuditLog,
    ClientAccess,
    ClientPending,
    Customer,
    CustomerContact,
    CustomerServiceInterest,
    Employee,
    FactoryLayout,
    Office,
    PersonnelSettings,
    Task,
    TaskNote,
    TaskEvent,
    WorkArea,
)
from .schemas import (
    AccountingClientCompaniesOut,
    AdmissionAttachmentOut,
    AdmissionChecklistIn,
    AdmissionChecklistOut,
    AdmissionWorkflowOut,
    AdmissionWorkflowStepIn,
    AdmissionWorkflowStepOut,
    AccountingClientCompanyBulkUpdateIn,
    AccountingClientCompanyIn,
    AccountingClientCompanyOut,
    AuditLogOut,
    AuditLogsOut,
    ClientAccessOut,
    ClientImpersonationRequest,
    ClientLoginOut,
    ClientPendingsOut,
    ClientPendingOut,
    CustomerBasicRegistrationIn,
    CustomerBasicRegistrationOut,
    CustomersOut,
    EmployeeOut,
    EmployeesOut,
    FactoryLayoutIn,
    FactoryLayoutOut,
    CustomerOut,
    LoginRequest,
    LoginResponse,
    OperationMap,
    OfficeIn,
    OfficeOut,
    OfficesOut,
    PersonnelRequestIn,
    PersonnelSettingsIn,
    PersonnelSettingsOut,
    TaskOut,
    TaskNoteIn,
    TaskNoteOut,
    TaskNotesOut,
    TaskEventOut,
    TaskEventsOut,
    WorkAreaOut,
)
from .seed import seed_database
from .settings import settings

app = FastAPI(title="PurpleSoft API", version="0.1.0")
bearer_scheme = HTTPBearer(auto_error=False)
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
project_root = Path(__file__).resolve().parents[2]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def make_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def portal_slug(value: str) -> str:
    ascii_value = normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    cleaned = "".join(char.lower() if char.isalnum() else "." for char in ascii_value)
    parts = [part for part in cleaned.split(".") if part]
    return ".".join(parts)[:32] or "cliente"


def generate_client_password(customer: Customer) -> str:
    return token_urlsafe(12)


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, stored_password: str) -> bool:
    if stored_password.startswith("$2"):
        return password_context.verify(password, stored_password)
    return password == stored_password


def make_token(subject: str, role: str, customer_id: str | None = None) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    payload = {"sub": subject, "role": role, "exp": expires_at}
    if customer_id:
        payload["customer_id"] = customer_id
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(credentials: HTTPAuthorizationCredentials | None, expected_role: str) -> dict[str, str]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token de acesso obrigatorio.")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado.") from exc
    if payload.get("role") != expected_role:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado.")
    return payload


def require_operator(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict[str, str]:
    return decode_token(credentials, "operator")


def require_client(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict[str, str]:
    payload = decode_token(credentials, "client")
    if not payload.get("customer_id"):
        raise HTTPException(status_code=401, detail="Token de cliente invalido.")
    return payload


def is_manager(operator: dict[str, str]) -> bool:
    return operator.get("sub") == settings.manager_email


def actor_from_token(payload: dict[str, str]) -> tuple[str, str]:
    return payload.get("role", "unknown"), payload.get("sub", "unknown")


def add_audit_log(
    db: Session,
    actor: dict[str, str],
    action: str,
    entity_type: str,
    entity_id: str,
    customer_id: str | None = None,
    details: dict[str, object] | None = None,
) -> None:
    actor_type, actor_subject = actor_from_token(actor)
    db.add(
        AuditLog(
            id=make_id("audit"),
            occurred_at=now_iso(),
            actor_type=actor_type,
            actor_subject=actor_subject,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            customer_id=customer_id,
            details=json.dumps(details or {}, ensure_ascii=False),
        )
    )


def audit_log_to_out(log: AuditLog) -> AuditLogOut:
    try:
        details = json.loads(log.details)
    except json.JSONDecodeError:
        details = {}
    return AuditLogOut(
        id=log.id,
        occurredAt=log.occurred_at,
        actorType=log.actor_type,
        actorSubject=log.actor_subject,
        action=log.action,
        entityType=log.entity_type,
        entityId=log.entity_id,
        customerId=log.customer_id,
        details=details,
    )


def customer_to_out(customer: Customer) -> CustomerOut:
    return CustomerOut(
        id=customer.id,
        officeId=customer.office_id,
        legalName=customer.legal_name,
        tradeName=customer.trade_name,
        cnpj=customer.cnpj,
        contractAddress=customer.contract_address,
        contractCityState=customer.contract_city_state,
        contractEmail=customer.contract_email,
        contacts=[
            {"id": contact.id, "name": contact.name, "role": contact.role, "phone": contact.phone, "email": contact.email}
            for contact in customer.contacts
        ],
        serviceInterests=[interest.service_type for interest in customer.service_interests],
        otherServiceDescription=customer.other_service_description,
    )


def access_to_out(access: ClientAccess | None, temporary_password: str | None = None) -> ClientAccessOut | None:
    if not access:
        return None
    return ClientAccessOut(
        id=access.id,
        customerId=access.customer_id,
        email=access.email,
        password=temporary_password,
        createdAt=access.created_at,
    )


def pending_to_out(pending: ClientPending | None) -> ClientPendingOut | None:
    if not pending:
        return None
    return ClientPendingOut(
        id=pending.id,
        customerId=pending.customer_id,
        title=pending.title,
        description=pending.description,
        status=pending.status,
        createdAt=pending.created_at,
        formType=pending.form_type,
    )


def accounting_scope(company: AccountingClientCompany) -> list[str]:
    scope: list[str] = []
    if company.accounting_delayed in {"Sim", "Nao sei informar"} or company.wants_accounting_regularization in {"Sim", "A avaliar"}:
        scope.append("avaliar regularizacao contabil")
    if company.closing_frequency:
        scope.append(f"fechamento contabil: {company.closing_frequency.lower()}")
    if company.wants_sped_ecd_ecf and company.wants_sped_ecd_ecf != "Nao":
        period = f" ({company.sped_period})" if company.sped_period else ""
        scope.append(f"SPED ECD/ECF: {company.wants_sped_ecd_ecf.lower()}{period}")
    if company.financial_system_reports == "Sim":
        scope.append("integrar relatorios do sistema financeiro")
    if company.only_bank_statements in {"Sim", "Parcialmente"}:
        scope.append("conferir extratos bancarios")
    if company.has_application_statements_pdf == "Sim":
        scope.append("conferir extratos de aplicacao/CC/EM")
    return scope or ["triagem contabil inicial"]


def accounting_company_to_out(company: AccountingClientCompany) -> AccountingClientCompanyOut:
    return AccountingClientCompanyOut(
        id=company.id,
        customerId=company.customer_id,
        pendingId=company.pending_id,
        companyName=company.company_name,
        cnpj=company.cnpj,
        taxRegime=company.tax_regime,
        spedEcdDelivery=company.sped_ecd_delivery,
        financialSystemReports=company.financial_system_reports,
        onlyBankStatements=company.only_bank_statements,
        banksUsed=company.banks_used,
        averageBankPages=company.average_bank_pages,
        hasApplicationStatementsPdf=company.has_application_statements_pdf,
        accountingDelayed=company.accounting_delayed,
        wantsAccountingRegularization=company.wants_accounting_regularization,
        closingFrequency=company.closing_frequency,
        systemUsed=company.system_used,
        wantsSpedEcdEcf=company.wants_sped_ecd_ecf,
        spedPeriod=company.sped_period,
        createdAt=company.created_at,
        scopeSummary=accounting_scope(company),
    )


def fill_accounting_company(company: AccountingClientCompany, payload: AccountingClientCompanyIn) -> None:
    company.company_name = payload.companyName
    company.cnpj = payload.cnpj
    company.tax_regime = payload.taxRegime
    company.sped_ecd_delivery = payload.spedEcdDelivery
    company.financial_system_reports = payload.financialSystemReports
    company.only_bank_statements = payload.onlyBankStatements
    company.banks_used = payload.banksUsed
    company.average_bank_pages = payload.averageBankPages
    company.has_application_statements_pdf = payload.hasApplicationStatementsPdf
    company.accounting_delayed = payload.accountingDelayed
    company.wants_accounting_regularization = payload.wantsAccountingRegularization
    company.closing_frequency = payload.closingFrequency
    company.system_used = payload.systemUsed
    company.wants_sped_ecd_ecf = payload.wantsSpedEcdEcf
    company.sped_period = payload.spedPeriod


def apply_accounting_company_updates(company: AccountingClientCompany, updates: dict[str, str]) -> None:
    field_map = {
        "taxRegime": "tax_regime",
        "spedEcdDelivery": "sped_ecd_delivery",
        "financialSystemReports": "financial_system_reports",
        "onlyBankStatements": "only_bank_statements",
        "banksUsed": "banks_used",
        "averageBankPages": "average_bank_pages",
        "hasApplicationStatementsPdf": "has_application_statements_pdf",
        "accountingDelayed": "accounting_delayed",
        "wantsAccountingRegularization": "wants_accounting_regularization",
        "closingFrequency": "closing_frequency",
        "systemUsed": "system_used",
        "wantsSpedEcdEcf": "wants_sped_ecd_ecf",
        "spedPeriod": "sped_period",
    }
    for payload_field, model_field in field_map.items():
        if payload_field in updates:
            setattr(company, model_field, updates[payload_field])


@app.on_event("startup")
def on_startup() -> None:
    with SessionLocal() as db:
        seed_database(db)
        legacy_accesses = db.scalars(select(ClientAccess)).all()
        changed = False
        for access in legacy_accesses:
            if not access.password.startswith("$2"):
                access.password = hash_password(access.password)
                changed = True
        if changed:
            db.commit()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/manuals/admission-required-documents")
def admission_required_documents_manual(download: bool = False) -> FileResponse:
    path = project_root / "docs" / "Parametros base" / "DOCUMENTAÇÃO NECESSÁRIA PARA ADMISSÃO.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Manual nao localizado.")
    disposition = "attachment" if download else "inline"
    return FileResponse(path, media_type="application/pdf", headers={"Content-Disposition": f'{disposition}; filename="manual-admissao.pdf"'})


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if payload.email != settings.operational_email or payload.password != settings.operational_password:
        raise HTTPException(status_code=401, detail="Login ou senha invalidos.")

    token = make_token(payload.email, "operator")
    return LoginResponse(access_token=token, name="Gerente Operacional", role="Operacao")


@app.get("/offices", response_model=OfficesOut)
def list_offices(
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OfficesOut:
    offices = db.scalars(select(Office).order_by(Office.name)).all()
    return OfficesOut(offices=[OfficeOut(id=office.id, name=office.name) for office in offices])


@app.get("/employees", response_model=EmployeesOut)
def list_employees(_: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> EmployeesOut:
    employees = db.scalars(select(Employee).where(Employee.active.is_(True)).order_by(Employee.name)).all()
    return EmployeesOut(employees=[EmployeeOut.model_validate(employee, from_attributes=True) for employee in employees])


@app.get("/factory-layout", response_model=FactoryLayoutOut)
def get_factory_layout(operator: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> FactoryLayoutOut:
    row = db.get(FactoryLayout, "default")
    return FactoryLayoutOut(layout=json.loads(row.layout) if row else {}, sockets=json.loads(row.sockets) if row else {}, canManage=is_manager(operator))


@app.put("/factory-layout", response_model=FactoryLayoutOut)
def save_factory_layout(payload: FactoryLayoutIn, operator: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> FactoryLayoutOut:
    if not is_manager(operator): raise HTTPException(status_code=403, detail="Somente o gestor pode alterar o layout.")
    row = db.get(FactoryLayout, "default") or FactoryLayout(id="default", layout="{}", sockets="{}", updated_at=now_iso(), updated_by=operator["sub"])
    row.layout, row.sockets, row.updated_at, row.updated_by = json.dumps(payload.layout), json.dumps(payload.sockets), now_iso(), operator["sub"]
    db.add(row); db.commit()
    return FactoryLayoutOut(layout=payload.layout, sockets=payload.sockets, canManage=True)


@app.post("/offices", response_model=OfficeOut, status_code=201)
def create_office(
    payload: OfficeIn,
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> OfficeOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Informe o nome do escritorio.")
    if db.scalar(select(Office).where(Office.name == name)):
        raise HTTPException(status_code=409, detail="Este escritorio ja esta cadastrado.")
    office = Office(id=make_id("office"), name=name)
    db.add(office)
    add_audit_log(db, operator, "create", "office", office.id, None, {"name": office.name})
    db.commit()
    return OfficeOut(id=office.id, name=office.name)


@app.get("/customers", response_model=CustomersOut)
def list_customers(
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> CustomersOut:
    customers = db.scalars(select(Customer).order_by(Customer.legal_name)).all()
    return CustomersOut(customers=[customer_to_out(customer) for customer in customers])


@app.post("/customers/basic-registration", response_model=CustomerBasicRegistrationOut)
def create_basic_customer(
    payload: CustomerBasicRegistrationIn,
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> CustomerBasicRegistrationOut:
    office = db.scalar(select(Office).where(Office.name == payload.officeName))
    if not office:
        office = Office(id=make_id("office"), name=payload.officeName)
        db.add(office)
        db.flush()

    customer = db.scalar(select(Customer).where(Customer.cnpj == payload.cnpj))
    if not customer:
        customer = Customer(id=make_id("customer"), office_id=office.id, legal_name=payload.legalName, cnpj=payload.cnpj)
        db.add(customer)
        customer_action = "create"
    else:
        customer_action = "update"

    customer.office_id = office.id
    customer.legal_name = payload.legalName
    customer.trade_name = payload.tradeName
    customer.cnpj = payload.cnpj
    customer.contract_address = payload.contractAddress
    customer.contract_city_state = payload.contractCityState
    customer.contract_email = payload.contractEmail
    customer.other_service_description = payload.otherServiceDescription

    customer.contacts.clear()
    for contact in payload.contacts:
        if not any([contact.name, contact.role, contact.phone, contact.email]):
            continue
        customer.contacts.append(
            CustomerContact(
                id=contact.id or make_id("contact"),
                name=contact.name,
                role=contact.role,
                phone=contact.phone,
                email=contact.email,
            )
        )

    customer.service_interests.clear()
    for service_type in payload.serviceInterests:
        customer.service_interests.append(CustomerServiceInterest(service_type=service_type))

    db.flush()

    access: ClientAccess | None = None
    temporary_password: str | None = None
    pending: ClientPending | None = None
    if "contabil" in payload.serviceInterests:
        access = db.scalar(select(ClientAccess).where(ClientAccess.customer_id == customer.id))
        if not access:
            first_contact_email = next((contact.email for contact in customer.contacts if contact.email), None)
            temporary_password = generate_client_password(customer)
            access = ClientAccess(
                id=make_id("access"),
                customer_id=customer.id,
                email=first_contact_email or customer.contract_email or f"{portal_slug(customer.trade_name or customer.legal_name)}@portal.purplesoft",
                password=hash_password(temporary_password),
                created_at=today_iso(),
            )
            db.add(access)
            add_audit_log(
                db,
                operator,
                "create",
                "client_access",
                access.id,
                customer.id,
                {"email": access.email},
            )

        pending = db.scalar(
            select(ClientPending).where(
                ClientPending.customer_id == customer.id,
                ClientPending.form_type == "contabil_onboarding",
            )
        )
        if not pending:
            pending = ClientPending(
                id=make_id("pending"),
                customer_id=customer.id,
                title="Cadastro inicial para servico contabil",
                description="Preencha as informacoes iniciais para prepararmos o contrato e a implantacao contabil.",
                status="pendente",
                created_at=today_iso(),
                form_type="contabil_onboarding",
            )
            db.add(pending)
            add_audit_log(
                db,
                operator,
                "create",
                "client_pending",
                pending.id,
                customer.id,
                {"formType": pending.form_type, "title": pending.title},
            )

    add_audit_log(
        db,
        operator,
        customer_action,
        "customer",
        customer.id,
        customer.id,
        {
            "legalName": customer.legal_name,
            "cnpj": customer.cnpj,
            "serviceInterests": payload.serviceInterests,
        },
    )
    db.commit()
    db.refresh(customer)
    if access:
        db.refresh(access)
    if pending:
        db.refresh(pending)

    return CustomerBasicRegistrationOut(customer=customer_to_out(customer), access=access_to_out(access, temporary_password), pending=pending_to_out(pending))


@app.post("/client/login", response_model=ClientLoginOut)
def client_login(payload: LoginRequest, db: Session = Depends(get_db)) -> ClientLoginOut:
    access = db.scalar(select(ClientAccess).where(ClientAccess.email == payload.email))
    if not access or not verify_password(payload.password, access.password):
        raise HTTPException(status_code=401, detail="Login ou senha invalidos.")
    if not access.password.startswith("$2"):
        access.password = hash_password(payload.password)
        db.commit()
    return ClientLoginOut(
        customerId=access.customer_id,
        customerName=access.customer.legal_name,
        access_token=make_token(access.email, "client", access.customer_id),
    )


@app.post("/client/impersonation-token", response_model=ClientLoginOut)
def client_impersonation_token(
    payload: ClientImpersonationRequest,
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> ClientLoginOut:
    customer = db.get(Customer, payload.customerId)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente nao localizado.")
    if payload.pendingId:
        pending = db.scalar(select(ClientPending).where(ClientPending.id == payload.pendingId, ClientPending.customer_id == customer.id))
        if not pending:
            raise HTTPException(status_code=404, detail="Pendencia nao localizada.")
    add_audit_log(
        db,
        operator,
        "impersonate",
        "customer",
        customer.id,
        customer.id,
        {"pendingId": payload.pendingId},
    )
    db.commit()
    return ClientLoginOut(
        customerId=customer.id,
        customerName=customer.legal_name,
        access_token=make_token(f"operator:{customer.id}", "client", customer.id),
    )


@app.get("/client/pendings", response_model=ClientPendingsOut)
def client_pendings(
    customer_id: str | None = Query(default=None),
    client: dict[str, str] = Depends(require_client),
    db: Session = Depends(get_db),
) -> ClientPendingsOut:
    token_customer_id = client["customer_id"]
    if customer_id and customer_id != token_customer_id:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado para este cliente.")
    pendings = db.scalars(select(ClientPending).where(ClientPending.customer_id == token_customer_id).order_by(ClientPending.created_at.desc())).all()
    return ClientPendingsOut(pendings=[pending_to_out(pending) for pending in pendings if pending_to_out(pending)])


@app.get("/client/accounting-companies", response_model=AccountingClientCompaniesOut)
def list_accounting_companies(
    customer_id: str | None = Query(default=None),
    pending_id: str = Query(...),
    client: dict[str, str] = Depends(require_client),
    db: Session = Depends(get_db),
) -> AccountingClientCompaniesOut:
    token_customer_id = client["customer_id"]
    if customer_id and customer_id != token_customer_id:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado para este cliente.")
    companies = db.scalars(
        select(AccountingClientCompany)
        .where(AccountingClientCompany.customer_id == token_customer_id, AccountingClientCompany.pending_id == pending_id)
        .order_by(AccountingClientCompany.created_at.desc(), AccountingClientCompany.company_name)
    ).all()
    return AccountingClientCompaniesOut(companies=[accounting_company_to_out(company) for company in companies])


@app.post("/client/accounting-companies", response_model=AccountingClientCompanyOut)
def create_accounting_company(
    payload: AccountingClientCompanyIn,
    client: dict[str, str] = Depends(require_client),
    db: Session = Depends(get_db),
) -> AccountingClientCompanyOut:
    if payload.customerId != client["customer_id"]:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado para este cliente.")
    pending = db.scalar(
        select(ClientPending).where(
            ClientPending.id == payload.pendingId,
            ClientPending.customer_id == payload.customerId,
        )
    )
    if not pending:
        raise HTTPException(status_code=404, detail="Pendencia nao localizada.")

    company = AccountingClientCompany(
        id=make_id("company"),
        customer_id=payload.customerId,
        pending_id=payload.pendingId,
        company_name="",
        cnpj="",
        tax_regime="",
        sped_ecd_delivery="",
        financial_system_reports="",
        only_bank_statements="",
        banks_used="",
        average_bank_pages="",
        has_application_statements_pdf="",
        accounting_delayed="",
        wants_accounting_regularization="",
        closing_frequency="",
        system_used="",
        wants_sped_ecd_ecf="",
        sped_period="",
        created_at=today_iso(),
    )
    fill_accounting_company(company, payload)
    db.add(company)
    pending.status = "em_preenchimento"
    add_audit_log(
        db,
        client,
        "create",
        "accounting_client_company",
        company.id,
        company.customer_id,
        {"companyName": company.company_name, "pendingId": company.pending_id},
    )
    db.commit()
    db.refresh(company)
    return accounting_company_to_out(company)


@app.put("/client/accounting-companies/{company_id}", response_model=AccountingClientCompanyOut)
def update_accounting_company(
    company_id: str,
    payload: AccountingClientCompanyIn,
    client: dict[str, str] = Depends(require_client),
    db: Session = Depends(get_db),
) -> AccountingClientCompanyOut:
    if payload.customerId != client["customer_id"]:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado para este cliente.")
    company = db.scalar(
        select(AccountingClientCompany).where(
            AccountingClientCompany.id == company_id,
            AccountingClientCompany.customer_id == payload.customerId,
            AccountingClientCompany.pending_id == payload.pendingId,
        )
    )
    if not company:
        raise HTTPException(status_code=404, detail="Empresa nao localizada.")
    fill_accounting_company(company, payload)
    add_audit_log(
        db,
        client,
        "update",
        "accounting_client_company",
        company.id,
        company.customer_id,
        {"companyName": company.company_name, "pendingId": company.pending_id},
    )
    db.commit()
    db.refresh(company)
    return accounting_company_to_out(company)


@app.patch("/client/accounting-companies/bulk", response_model=AccountingClientCompaniesOut)
def bulk_update_accounting_companies(
    payload: AccountingClientCompanyBulkUpdateIn,
    client: dict[str, str] = Depends(require_client),
    db: Session = Depends(get_db),
) -> AccountingClientCompaniesOut:
    if payload.customerId != client["customer_id"]:
        raise HTTPException(status_code=403, detail="Acesso nao autorizado para este cliente.")
    if not payload.companyIds:
        raise HTTPException(status_code=400, detail="Selecione ao menos uma empresa.")

    updates = payload.model_dump(exclude={"customerId", "pendingId", "companyIds"}, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Selecione ao menos um campo para atualizar.")

    companies = db.scalars(
        select(AccountingClientCompany)
        .where(
            AccountingClientCompany.customer_id == payload.customerId,
            AccountingClientCompany.pending_id == payload.pendingId,
            AccountingClientCompany.id.in_(payload.companyIds),
        )
        .order_by(AccountingClientCompany.created_at.desc(), AccountingClientCompany.company_name)
    ).all()
    if len(companies) != len(set(payload.companyIds)):
        raise HTTPException(status_code=404, detail="Uma ou mais empresas nao foram localizadas.")

    for company in companies:
        apply_accounting_company_updates(company, updates)
        add_audit_log(
            db,
            client,
            "bulk_update",
            "accounting_client_company",
            company.id,
            company.customer_id,
            {"pendingId": company.pending_id, "fields": sorted(updates.keys())},
        )

    db.commit()
    for company in companies:
        db.refresh(company)
    return AccountingClientCompaniesOut(companies=[accounting_company_to_out(company) for company in companies])


def personnel_settings_to_out(settings_row: PersonnelSettings) -> PersonnelSettingsOut:
    return PersonnelSettingsOut(
        admissionSlaDays=settings_row.admission_sla_days,
        terminationSlaDays=settings_row.termination_sla_days,
        vacationSlaDays=settings_row.vacation_sla_days,
        payrollDueDay=settings_row.payroll_due_day,
        criticalStartDay=settings_row.critical_start_day,
        criticalEndDay=settings_row.critical_end_day,
        warningDays=settings_row.warning_days,
    )


@app.get("/personnel-settings", response_model=PersonnelSettingsOut)
def get_personnel_settings(_: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> PersonnelSettingsOut:
    settings_row = db.get(PersonnelSettings, "default")
    if not settings_row:
        settings_row = PersonnelSettings(id="default")
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return personnel_settings_to_out(settings_row)


@app.put("/personnel-settings", response_model=PersonnelSettingsOut)
def update_personnel_settings(payload: PersonnelSettingsIn, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> PersonnelSettingsOut:
    settings_row = db.get(PersonnelSettings, "default") or PersonnelSettings(id="default")
    settings_row.admission_sla_days = payload.admissionSlaDays
    settings_row.termination_sla_days = payload.terminationSlaDays
    settings_row.vacation_sla_days = payload.vacationSlaDays
    settings_row.payroll_due_day = payload.payrollDueDay
    settings_row.critical_start_day = payload.criticalStartDay
    settings_row.critical_end_day = payload.criticalEndDay
    settings_row.warning_days = payload.warningDays
    db.add(settings_row)
    db.commit()
    db.refresh(settings_row)
    return personnel_settings_to_out(settings_row)


@app.post("/personnel-requests", response_model=TaskOut, status_code=201)
def create_personnel_request(
    payload: PersonnelRequestIn,
    operator: dict[str, str] = Depends(require_operator),
    db: Session = Depends(get_db),
) -> TaskOut:
    station_titles = {
        "admissoes": "Admissao de colaborador",
        "rescisoes": "Rescisao contratual",
        "ferias": "Calculo de ferias",
    }
    if payload.stationId not in station_titles:
        raise HTTPException(status_code=422, detail="Tipo de solicitacao invalido.")
    if payload.priority not in {"baixa", "normal", "alta", "critica"}:
        raise HTTPException(status_code=422, detail="Prioridade invalida.")
    if not payload.employeeName.strip():
        raise HTTPException(status_code=422, detail="Informe o nome do colaborador.")
    try:
        datetime.strptime(payload.requestedAt, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Data da solicitacao invalida.") from exc

    customer = db.get(Customer, payload.customerId)
    if not customer:
        raise HTTPException(status_code=404, detail="Empresa nao encontrada.")
    has_personnel_service = db.scalar(
        select(CustomerServiceInterest.id).where(
            CustomerServiceInterest.customer_id == customer.id,
            CustomerServiceInterest.service_type == "pessoal",
        )
    )
    if not has_personnel_service:
        raise HTTPException(status_code=422, detail="A empresa selecionada nao possui o servico de Departamento Pessoal.")

    task = Task(
        title=station_titles[payload.stationId],
        client_name=customer.trade_name or customer.legal_name,
        status="pending" if payload.checklistReady else "waiting_release",
        area_id="pessoal",
        priority=payload.priority,
        station_id=payload.stationId,
        requested_at=payload.requestedAt,
        checklist_ready=payload.checklistReady,
        customer_id=customer.id,
        employee_name=payload.employeeName.strip(),
        request_notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(task)
    db.flush()
    task.task_code = f"T-{task.id:06d}"
    db.flush()
    add_audit_log(
        db,
        operator,
        "personnel_request_created",
        "task",
        str(task.id),
        customer.id,
        {"stationId": task.station_id, "employeeName": task.employee_name, "checklistReady": task.checklist_ready},
    )
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task, from_attributes=True)


ADMISSION_STEPS = ["conference", "registration", "esocial", "contracts", "communication"]
ADMISSION_STEP_LABELS = {"conference": "Conferência", "registration": "Cadastro", "esocial": "eSocial", "contracts": "Contratos", "communication": "Comunicação"}


def admission_workflow_out(task: Task, db: Session) -> AdmissionWorkflowOut:
    rows = {row.step_key: row for row in db.scalars(select(AdmissionWorkflowStep).where(AdmissionWorkflowStep.task_id == task.id)).all()}
    if not rows:
        for index, step_key in enumerate(ADMISSION_STEPS):
            status = "waiting_release" if index == 0 and task.status == "waiting_release" else "pending" if index == 0 else "locked"
            db.add(AdmissionWorkflowStep(task_id=task.id, step_key=step_key, status=status, released_at=now_iso() if status == "pending" else None))
        db.commit()
        rows = {row.step_key: row for row in db.scalars(select(AdmissionWorkflowStep).where(AdmissionWorkflowStep.task_id == task.id)).all()}
    return AdmissionWorkflowOut(steps=[AdmissionWorkflowStepOut(stepKey=key, status=rows[key].status, assignee=rows[key].assignee, releasedAt=rows[key].released_at, completedAt=rows[key].completed_at) for key in ADMISSION_STEPS])


def task_out(task: Task, db: Session) -> TaskOut:
    result = TaskOut.model_validate(task, from_attributes=True)
    if task.area_id == "pessoal" and task.station_id == "admissoes":
        step = db.scalar(select(AdmissionWorkflowStep.step_key).where(AdmissionWorkflowStep.task_id == task.id, AdmissionWorkflowStep.status != "done").order_by(AdmissionWorkflowStep.id))
        result.workflow_stage = step or "completed"
    return result


def admission_task_or_404(task_id: int, db: Session) -> Task:
    task = db.get(Task, task_id)
    if not task or task.area_id != "pessoal" or task.station_id != "admissoes":
        raise HTTPException(status_code=404, detail="Admissão não encontrada.")
    return task


def admission_checklist_out(task_id: int, db: Session) -> AdmissionChecklistOut:
    checklist = db.get(AdmissionChecklist, task_id)
    attachments = db.scalars(select(AdmissionAttachment).where(AdmissionAttachment.task_id == task_id).order_by(AdmissionAttachment.document_key)).all()
    form_data = json.loads(checklist.form_data) if checklist else {}
    return AdmissionChecklistOut(
        form=form_data,
        released=checklist.released if checklist else False,
        updatedAt=checklist.updated_at if checklist else None,
        documents=[AdmissionAttachmentOut(documentKey=item.document_key, fileName=item.file_name, contentType=item.content_type) for item in attachments],
    )


@app.get("/admissions/{task_id}", response_model=AdmissionChecklistOut)
def get_admission_checklist(task_id: int, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> AdmissionChecklistOut:
    admission_task_or_404(task_id, db)
    return admission_checklist_out(task_id, db)


@app.put("/admissions/{task_id}", response_model=AdmissionChecklistOut)
def save_admission_checklist(task_id: int, payload: AdmissionChecklistIn, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> AdmissionChecklistOut:
    task = admission_task_or_404(task_id, db)
    checklist = db.get(AdmissionChecklist, task_id)
    if not checklist:
        checklist = AdmissionChecklist(task_id=task_id, form_data="{}", released=False, updated_at=now_iso())
        db.add(checklist)
    checklist.form_data = json.dumps(payload.form, ensure_ascii=False)
    checklist.released, checklist.updated_at = payload.released, now_iso()
    if payload.released and task.status == "waiting_release":
        task.status, task.checklist_ready = "pending", True
        db.add(TaskEvent(task_id=task_id, message="Checklist de admissão liberado para execução.", occurred_at=now_iso()))
    db.commit()
    return admission_checklist_out(task_id, db)


@app.post("/admissions/{task_id}/documents/{document_key}", response_model=AdmissionAttachmentOut)
async def upload_admission_document(task_id: int, document_key: str, file: UploadFile = File(...), _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> AdmissionAttachmentOut:
    admission_task_or_404(task_id, db)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Selecione um arquivo para enviar.")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O arquivo deve ter no máximo 25 MB.")
    attachment = db.scalar(select(AdmissionAttachment).where(AdmissionAttachment.task_id == task_id, AdmissionAttachment.document_key == document_key))
    if not attachment:
        attachment = AdmissionAttachment(task_id=task_id, document_key=document_key, file_name=file.filename or "arquivo", content_type=file.content_type or "application/octet-stream", content=content, updated_at=now_iso())
        db.add(attachment)
    else:
        attachment.file_name, attachment.content_type, attachment.content, attachment.updated_at = file.filename or "arquivo", file.content_type or "application/octet-stream", content, now_iso()
    db.commit()
    return AdmissionAttachmentOut(documentKey=attachment.document_key, fileName=attachment.file_name, contentType=attachment.content_type)


@app.get("/admissions/{task_id}/documents/{document_key}")
def download_admission_document(task_id: int, document_key: str, download: bool = False, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> Response:
    admission_task_or_404(task_id, db)
    attachment = db.scalar(select(AdmissionAttachment).where(AdmissionAttachment.task_id == task_id, AdmissionAttachment.document_key == document_key))
    if not attachment:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    disposition = "attachment" if download else "inline"
    return Response(content=attachment.content, media_type=attachment.content_type, headers={"Content-Disposition": f'{disposition}; filename="{attachment.file_name}"'})


@app.get("/admission-workflows/{task_id}", response_model=AdmissionWorkflowOut)
def get_admission_workflow(task_id: int, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> AdmissionWorkflowOut:
    task = db.get(Task, task_id)
    if not task or task.area_id != "pessoal" or task.station_id != "admissoes":
        raise HTTPException(status_code=404, detail="Admissão não encontrada.")
    return admission_workflow_out(task, db)


@app.put("/admission-workflows/{task_id}/steps/{step_key}", response_model=AdmissionWorkflowOut)
def update_admission_workflow_step(task_id: int, step_key: str, payload: AdmissionWorkflowStepIn, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> AdmissionWorkflowOut:
    task = db.get(Task, task_id)
    if not task or step_key not in ADMISSION_STEPS:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    admission_workflow_out(task, db)
    row = db.scalar(select(AdmissionWorkflowStep).where(AdmissionWorkflowStep.task_id == task_id, AdmissionWorkflowStep.step_key == step_key))
    if not row or payload.status not in {"pending", "in_progress", "waiting", "done"}:
        raise HTTPException(status_code=422, detail="Atualização inválida.")
    row.status, row.assignee = payload.status, payload.assignee
    if not row.released_at and payload.status in {"pending", "in_progress", "done"}: row.released_at = now_iso()
    row.completed_at = now_iso() if payload.status == "done" else None
    if payload.status == "done":
        db.add(TaskEvent(task_id=task_id, message=f"Etapa {ADMISSION_STEP_LABELS[step_key]} concluída.", occurred_at=now_iso()))
        index = ADMISSION_STEPS.index(step_key)
        if index + 1 < len(ADMISSION_STEPS):
            next_row = db.scalar(select(AdmissionWorkflowStep).where(AdmissionWorkflowStep.task_id == task_id, AdmissionWorkflowStep.step_key == ADMISSION_STEPS[index + 1]))
            if next_row and next_row.status == "locked":
                next_row.status, next_row.released_at = "pending", now_iso()
                db.add(TaskEvent(task_id=task_id, message=f"Etapa {ADMISSION_STEP_LABELS[next_row.step_key]} liberada.", occurred_at=now_iso()))
    db.commit()
    return admission_workflow_out(task, db)


def task_note_out(note: TaskNote) -> TaskNoteOut:
    return TaskNoteOut(id=note.id, body=note.body, author=note.author, createdAt=note.created_at, updatedAt=note.updated_at)


@app.get("/tasks/{task_id}/history", response_model=TaskEventsOut)
def task_history(task_id: int, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> TaskEventsOut:
    events = db.scalars(select(TaskEvent).where(TaskEvent.task_id == task_id).order_by(TaskEvent.occurred_at.desc())).all()
    return TaskEventsOut(events=[TaskEventOut(id=event.id, message=event.message, occurredAt=event.occurred_at) for event in events])


@app.get("/tasks/{task_id}/notes", response_model=TaskNotesOut)
def list_task_notes(task_id: int, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> TaskNotesOut:
    if not db.get(Task, task_id): raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    notes = db.scalars(select(TaskNote).where(TaskNote.task_id == task_id).order_by(TaskNote.created_at.desc())).all()
    return TaskNotesOut(notes=[task_note_out(note) for note in notes])


@app.post("/tasks/{task_id}/notes", response_model=TaskNoteOut, status_code=201)
def create_task_note(task_id: int, payload: TaskNoteIn, operator: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> TaskNoteOut:
    if not db.get(Task, task_id): raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    note = TaskNote(task_id=task_id, body=payload.body.strip(), author=operator["sub"], created_at=now_iso())
    db.add(note); db.add(TaskEvent(task_id=task_id, message="Nova nota registrada.", occurred_at=now_iso())); db.commit(); db.refresh(note)
    return task_note_out(note)


@app.put("/tasks/{task_id}/notes/{note_id}", response_model=TaskNoteOut)
def update_task_note(task_id: int, note_id: int, payload: TaskNoteIn, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> TaskNoteOut:
    note = db.scalar(select(TaskNote).where(TaskNote.id == note_id, TaskNote.task_id == task_id))
    if not note: raise HTTPException(status_code=404, detail="Nota não encontrada.")
    note.body, note.updated_at = payload.body.strip(), now_iso(); db.add(TaskEvent(task_id=task_id, message="Nota editada.", occurred_at=now_iso())); db.commit(); db.refresh(note)
    return task_note_out(note)


@app.delete("/tasks/{task_id}/notes/{note_id}", status_code=204)
def delete_task_note(task_id: int, note_id: int, _: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> None:
    note = db.scalar(select(TaskNote).where(TaskNote.id == note_id, TaskNote.task_id == task_id))
    if not note: raise HTTPException(status_code=404, detail="Nota não encontrada.")
    db.delete(note); db.add(TaskEvent(task_id=task_id, message="Nota excluída.", occurred_at=now_iso())); db.commit()


@app.get("/operation-map", response_model=OperationMap)
def operation_map(_: dict[str, str] = Depends(require_operator), db: Session = Depends(get_db)) -> OperationMap:
    areas = db.scalars(select(WorkArea)).all()
    tasks = db.scalars(select(Task)).all()
    running = sum(1 for task in tasks if task.status == "running")
    blocked = sum(1 for task in tasks if task.status == "blocked")
    attention = sum(area.priority for area in areas)
    done = sum(1 for task in tasks if task.status == "done")

    return OperationMap(
        areas=[WorkAreaOut.model_validate(area, from_attributes=True) for area in areas],
        tasks=[task_out(task, db) for task in tasks],
        summary={
            "running": running,
            "pending": sum(area.pending for area in areas),
            "priority": attention,
            "blocked": blocked,
            "productivity": 78,
            "quality": 96,
            "done": done,
        },
    )


@app.get("/audit-logs", response_model=AuditLogsOut)
def audit_logs(
    _: dict[str, str] = Depends(require_operator),
    customer_id: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> AuditLogsOut:
    query = select(AuditLog)
    if customer_id:
        query = query.where(AuditLog.customer_id == customer_id)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    logs = db.scalars(query.order_by(AuditLog.occurred_at.desc()).limit(limit)).all()
    return AuditLogsOut(logs=[audit_log_to_out(log) for log in logs])
