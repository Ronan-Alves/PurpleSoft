from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    role: str


class WorkAreaOut(BaseModel):
    id: str
    name: str
    kind: str
    status: str
    position_x: int
    position_y: int
    wip: int
    pending: int
    priority: int


class TaskOut(BaseModel):
    id: int
    title: str
    client_name: str
    status: str
    area_id: str


class OperationMap(BaseModel):
    areas: list[WorkAreaOut]
    tasks: list[TaskOut]
    summary: dict[str, int | float]


class CustomerContactIn(BaseModel):
    id: str | None = None
    name: str
    role: str
    phone: str
    email: str


class CustomerBasicRegistrationIn(BaseModel):
    officeName: str
    legalName: str
    tradeName: str | None = None
    cnpj: str
    contractAddress: str | None = None
    contractCityState: str | None = None
    contractEmail: str | None = None
    contacts: list[CustomerContactIn] = []
    serviceInterests: list[str] = []
    otherServiceDescription: str | None = None


class CustomerOut(BaseModel):
    id: str
    officeId: str
    legalName: str
    tradeName: str | None = None
    cnpj: str
    contractAddress: str | None = None
    contractCityState: str | None = None
    contractEmail: str | None = None
    contacts: list[CustomerContactIn] = []
    serviceInterests: list[str] = []
    otherServiceDescription: str | None = None


class ClientAccessOut(BaseModel):
    id: str
    customerId: str
    email: str
    password: str | None = None
    createdAt: str


class ClientPendingOut(BaseModel):
    id: str
    customerId: str
    title: str
    description: str
    status: str
    createdAt: str
    formType: str


class CustomerBasicRegistrationOut(BaseModel):
    customer: CustomerOut
    access: ClientAccessOut | None = None
    pending: ClientPendingOut | None = None


class ClientLoginOut(BaseModel):
    customerId: str
    customerName: str
    access_token: str
    token_type: str = "bearer"


class ClientImpersonationRequest(BaseModel):
    customerId: str
    pendingId: str | None = None


class ClientPendingsOut(BaseModel):
    pendings: list[ClientPendingOut]


class AccountingClientCompanyIn(BaseModel):
    customerId: str
    pendingId: str
    companyName: str
    cnpj: str
    taxRegime: str
    spedEcdDelivery: str
    financialSystemReports: str
    onlyBankStatements: str
    banksUsed: str
    averageBankPages: str
    hasApplicationStatementsPdf: str
    accountingDelayed: str
    wantsAccountingRegularization: str
    closingFrequency: str
    systemUsed: str
    wantsSpedEcdEcf: str
    spedPeriod: str


class AccountingClientCompanyBulkUpdateIn(BaseModel):
    customerId: str
    pendingId: str
    companyIds: list[str]
    taxRegime: str | None = None
    spedEcdDelivery: str | None = None
    financialSystemReports: str | None = None
    onlyBankStatements: str | None = None
    banksUsed: str | None = None
    averageBankPages: str | None = None
    hasApplicationStatementsPdf: str | None = None
    accountingDelayed: str | None = None
    wantsAccountingRegularization: str | None = None
    closingFrequency: str | None = None
    systemUsed: str | None = None
    wantsSpedEcdEcf: str | None = None
    spedPeriod: str | None = None


class AccountingClientCompanyOut(AccountingClientCompanyIn):
    id: str
    createdAt: str
    scopeSummary: list[str]


class AccountingClientCompaniesOut(BaseModel):
    companies: list[AccountingClientCompanyOut]


class AuditLogOut(BaseModel):
    id: str
    occurredAt: str
    actorType: str
    actorSubject: str
    action: str
    entityType: str
    entityId: str
    customerId: str | None = None
    details: dict[str, object]


class AuditLogsOut(BaseModel):
    logs: list[AuditLogOut]
