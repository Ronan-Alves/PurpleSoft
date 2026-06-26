from datetime import datetime, timedelta, timezone
from unicodedata import normalize
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal, get_db
from .models import (
    AccountingClientCompany,
    ClientAccess,
    ClientPending,
    Customer,
    CustomerContact,
    CustomerServiceInterest,
    Office,
    Task,
    WorkArea,
)
from .schemas import (
    AccountingClientCompaniesOut,
    AccountingClientCompanyIn,
    AccountingClientCompanyOut,
    ClientAccessOut,
    ClientLoginOut,
    ClientPendingsOut,
    ClientPendingOut,
    CustomerBasicRegistrationIn,
    CustomerBasicRegistrationOut,
    CustomerOut,
    LoginRequest,
    LoginResponse,
    OperationMap,
    TaskOut,
    WorkAreaOut,
)
from .seed import seed_database
from .settings import settings

app = FastAPI(title="PurpleSoft API", version="0.1.0")

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


def portal_slug(value: str) -> str:
    ascii_value = normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    cleaned = "".join(char.lower() if char.isalnum() else "." for char in ascii_value)
    parts = [part for part in cleaned.split(".") if part]
    return ".".join(parts)[:32] or "cliente"


def generate_client_password(customer: Customer) -> str:
    digits = "".join(char for char in customer.cnpj if char.isdigit())[-4:] or "0000"
    base = portal_slug(customer.trade_name or customer.legal_name).replace(".", "")[:8] or "cliente"
    return f"{base}{digits}"


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


def access_to_out(access: ClientAccess | None) -> ClientAccessOut | None:
    if not access:
        return None
    return ClientAccessOut(
        id=access.id,
        customerId=access.customer_id,
        email=access.email,
        password=access.password,
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


@app.on_event("startup")
def on_startup() -> None:
    with SessionLocal() as db:
        seed_database(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Informe email e senha.")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    token = jwt.encode({"sub": payload.email, "exp": expires_at}, settings.jwt_secret, algorithm="HS256")
    return LoginResponse(access_token=token, name="Gerente Operacional", role="Operacao")


@app.post("/customers/basic-registration", response_model=CustomerBasicRegistrationOut)
def create_basic_customer(payload: CustomerBasicRegistrationIn, db: Session = Depends(get_db)) -> CustomerBasicRegistrationOut:
    office = db.scalar(select(Office).where(Office.name == payload.officeName))
    if not office:
        office = Office(id=make_id("office"), name=payload.officeName)
        db.add(office)
        db.flush()

    customer = db.scalar(select(Customer).where(Customer.cnpj == payload.cnpj))
    if not customer:
        customer = Customer(id=make_id("customer"), office_id=office.id, legal_name=payload.legalName, cnpj=payload.cnpj)
        db.add(customer)

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
    pending: ClientPending | None = None
    if "contabil" in payload.serviceInterests:
        access = db.scalar(select(ClientAccess).where(ClientAccess.customer_id == customer.id))
        if not access:
            first_contact_email = next((contact.email for contact in customer.contacts if contact.email), None)
            access = ClientAccess(
                id=make_id("access"),
                customer_id=customer.id,
                email=first_contact_email or customer.contract_email or f"{portal_slug(customer.trade_name or customer.legal_name)}@portal.purplesoft",
                password=generate_client_password(customer),
                created_at=today_iso(),
            )
            db.add(access)

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

    db.commit()
    db.refresh(customer)
    if access:
        db.refresh(access)
    if pending:
        db.refresh(pending)

    return CustomerBasicRegistrationOut(customer=customer_to_out(customer), access=access_to_out(access), pending=pending_to_out(pending))


@app.post("/client/login", response_model=ClientLoginOut)
def client_login(payload: LoginRequest, db: Session = Depends(get_db)) -> ClientLoginOut:
    access = db.scalar(select(ClientAccess).where(ClientAccess.email == payload.email, ClientAccess.password == payload.password))
    if not access:
        raise HTTPException(status_code=401, detail="Login ou senha invalidos.")
    return ClientLoginOut(customerId=access.customer_id, customerName=access.customer.legal_name)


@app.get("/client/pendings", response_model=ClientPendingsOut)
def client_pendings(customer_id: str = Query(...), db: Session = Depends(get_db)) -> ClientPendingsOut:
    pendings = db.scalars(select(ClientPending).where(ClientPending.customer_id == customer_id).order_by(ClientPending.created_at.desc())).all()
    return ClientPendingsOut(pendings=[pending_to_out(pending) for pending in pendings if pending_to_out(pending)])


@app.get("/client/accounting-companies", response_model=AccountingClientCompaniesOut)
def list_accounting_companies(
    customer_id: str = Query(...),
    pending_id: str = Query(...),
    db: Session = Depends(get_db),
) -> AccountingClientCompaniesOut:
    companies = db.scalars(
        select(AccountingClientCompany)
        .where(AccountingClientCompany.customer_id == customer_id, AccountingClientCompany.pending_id == pending_id)
        .order_by(AccountingClientCompany.created_at.desc(), AccountingClientCompany.company_name)
    ).all()
    return AccountingClientCompaniesOut(companies=[accounting_company_to_out(company) for company in companies])


@app.post("/client/accounting-companies", response_model=AccountingClientCompanyOut)
def create_accounting_company(payload: AccountingClientCompanyIn, db: Session = Depends(get_db)) -> AccountingClientCompanyOut:
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
        company_name=payload.companyName,
        cnpj=payload.cnpj,
        tax_regime=payload.taxRegime,
        sped_ecd_delivery=payload.spedEcdDelivery,
        financial_system_reports=payload.financialSystemReports,
        only_bank_statements=payload.onlyBankStatements,
        banks_used=payload.banksUsed,
        average_bank_pages=payload.averageBankPages,
        has_application_statements_pdf=payload.hasApplicationStatementsPdf,
        accounting_delayed=payload.accountingDelayed,
        wants_accounting_regularization=payload.wantsAccountingRegularization,
        closing_frequency=payload.closingFrequency,
        system_used=payload.systemUsed,
        wants_sped_ecd_ecf=payload.wantsSpedEcdEcf,
        sped_period=payload.spedPeriod,
        created_at=today_iso(),
    )
    db.add(company)
    pending.status = "em_preenchimento"
    db.commit()
    db.refresh(company)
    return accounting_company_to_out(company)


@app.get("/operation-map", response_model=OperationMap)
def operation_map(db: Session = Depends(get_db)) -> OperationMap:
    areas = db.scalars(select(WorkArea)).all()
    tasks = db.scalars(select(Task)).all()
    running = sum(1 for task in tasks if task.status == "running")
    blocked = sum(1 for task in tasks if task.status == "blocked")
    attention = sum(area.priority for area in areas)
    done = sum(1 for task in tasks if task.status == "done")

    return OperationMap(
        areas=[WorkAreaOut.model_validate(area, from_attributes=True) for area in areas],
        tasks=[TaskOut.model_validate(task, from_attributes=True) for task in tasks],
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
