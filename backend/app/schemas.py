from pydantic import BaseModel, Field


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


class EmployeeOut(BaseModel):
    id: str
    name: str
    area_id: str
    active: bool


class EmployeesOut(BaseModel):
    employees: list[EmployeeOut]


class TaskOut(BaseModel):
    id: int
    task_code: str | None = None
    title: str
    client_name: str
    status: str
    area_id: str
    priority: str
    assignee: str | None = None
    station_id: str | None = None
    requested_at: str | None = None
    checklist_ready: bool = False
    customer_id: str | None = None
    employee_name: str | None = None
    request_notes: str | None = None
    workflow_stage: str | None = None


class OperationMap(BaseModel):
    areas: list[WorkAreaOut]
    tasks: list[TaskOut]
    summary: dict[str, int | float]


class PersonnelSettingsIn(BaseModel):
    admissionSlaDays: int = Field(ge=1, le=30)
    terminationSlaDays: int = Field(ge=1, le=30)
    vacationSlaDays: int = Field(ge=1, le=30)
    payrollDueDay: int = Field(ge=1, le=31)
    criticalStartDay: int = Field(ge=1, le=31)
    criticalEndDay: int = Field(ge=1, le=31)
    warningDays: int = Field(ge=0, le=15)


class PersonnelSettingsOut(PersonnelSettingsIn):
    pass


class PersonnelRequestIn(BaseModel):
    customerId: str
    stationId: str
    employeeName: str
    requestedAt: str
    priority: str = "normal"
    checklistReady: bool = False
    notes: str | None = None


class AdmissionWorkflowStepOut(BaseModel):
    stepKey: str
    status: str
    assignee: str | None = None
    releasedAt: str | None = None
    completedAt: str | None = None


class AdmissionWorkflowOut(BaseModel):
    steps: list[AdmissionWorkflowStepOut]


class AdmissionWorkflowStepIn(BaseModel):
    status: str
    assignee: str | None = None


class ManagerReviewIn(BaseModel):
    decision: str


class AdmissionChecklistIn(BaseModel):
    form: dict[str, str | bool]
    released: bool = False


class AdmissionAttachmentOut(BaseModel):
    documentKey: str
    fileName: str
    contentType: str


class AdmissionChecklistOut(AdmissionChecklistIn):
    documents: list[AdmissionAttachmentOut]
    updatedAt: str | None = None


class TaskNoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class TaskNoteOut(BaseModel):
    id: int
    body: str
    author: str
    createdAt: str
    updatedAt: str | None = None


class TaskNotesOut(BaseModel):
    notes: list[TaskNoteOut]


class TaskEventOut(BaseModel):
    id: int
    message: str
    occurredAt: str


class TaskEventsOut(BaseModel):
    events: list[TaskEventOut]


class FactoryLayoutIn(BaseModel):
    layout: dict[str, object]
    sockets: dict[str, object]


class FactoryLayoutOut(FactoryLayoutIn):
    canManage: bool


class CustomerContactIn(BaseModel):
    id: str | None = None
    name: str
    role: str
    phone: str
    email: str


class OfficeIn(BaseModel):
    name: str


class OfficeOut(BaseModel):
    id: str
    name: str


class OfficesOut(BaseModel):
    offices: list[OfficeOut]


class CustomerBasicRegistrationIn(BaseModel):
    officeName: str
    legalName: str
    tradeName: str | None = None
    cnpj: str
    contractAddress: str | None = None
    contractCityState: str | None = None
    contractEmail: str | None = None
    contacts: list[CustomerContactIn] = []
    serviceInterests: list[str] = Field(min_length=1)
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


class CustomersOut(BaseModel):
    customers: list[CustomerOut]


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
