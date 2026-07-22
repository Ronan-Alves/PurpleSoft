import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8088";

export type WorkArea = {
  id: string;
  name: string;
  kind: string;
  status: string;
  position_x: number;
  position_y: number;
  wip: number;
  pending: number;
  priority: number;
};

export type Employee = {
  id: string;
  name: string;
  area_id: string;
  active: boolean;
};

export type Task = {
  id: number;
  task_code?: string | null;
  title: string;
  client_name: string;
  status: string;
  area_id: string;
  priority: string;
  assignee?: string | null;
  station_id?: string | null;
  requested_at?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
  checklist_ready?: boolean;
  customer_id?: string | null;
  employee_name?: string | null;
  request_notes?: string | null;
  workflow_stage?: string | null;
};

export type OperationMap = {
  areas: WorkArea[];
  tasks: Task[];
  summary: Record<string, number>;
};

export const processPoints = [
  { id: "p1", label: "1", name: "Entrada", x: 9, y: 34 },
  { id: "p2", label: "2", name: "Cadastro", x: 22, y: 34 },
  { id: "p3", label: "3", name: "Financeiro", x: 36, y: 34 },
  { id: "p4", label: "4", name: "Triagem", x: 50, y: 33 },
  { id: "p5", label: "5", name: "Contabil", x: 66, y: 26 },
  { id: "p6", label: "6", name: "Pessoal", x: 64, y: 62 },
  { id: "p7", label: "7", name: "Consolidacao", x: 81, y: 48 },
  { id: "p8", label: "8", name: "Entrega", x: 93, y: 42 }
];

export const departmentZones = [
  { id: "contabil-zone", title: "Departamento Contabil", subtitle: "Receitas · Despesas · Ajustes", x: 55, y: 9, width: 25, height: 29 },
  { id: "pessoal-zone", title: "Departamento Pessoal", subtitle: "Admissoes · Rescisoes · Folha", x: 53, y: 49, width: 26, height: 28 }
];

export const fallbackMap: OperationMap = {
  areas: [
    { id: "entrada", name: "Entrada da Demanda", kind: "intake", status: "available", position_x: 9, position_y: 22, wip: 12, pending: 3, priority: 0 },
    { id: "cadastro", name: "Cadastro", kind: "station", status: "running", position_x: 22, position_y: 23, wip: 9, pending: 2, priority: 1 },
    { id: "financeiro", name: "Financeiro", kind: "station", status: "attention", position_x: 36, position_y: 23, wip: 14, pending: 5, priority: 2 },
    { id: "triagem", name: "Triagem", kind: "station", status: "running", position_x: 50, position_y: 22, wip: 18, pending: 4, priority: 1 },
    { id: "contabil", name: "Departamento Contabil", kind: "department", status: "running", position_x: 67.5, position_y: 22, wip: 31, pending: 8, priority: 3 },
    { id: "pessoal", name: "Departamento Pessoal", kind: "department", status: "available", position_x: 66, position_y: 62, wip: 24, pending: 6, priority: 1 },
    { id: "consolidacao", name: "Consolidacao", kind: "station", status: "running", position_x: 82, position_y: 49, wip: 16, pending: 2, priority: 0 },
    { id: "entrega", name: "Entrega Final", kind: "delivery", status: "done", position_x: 93, position_y: 35, wip: 7, pending: 1, priority: 0 }
  ],
  tasks: [
    { id: 1, title: "Fechamento contabil", client_name: "Escritorio Alfa", status: "running", area_id: "contabil", priority: "alta", assignee: "Ana Souza" },
    { id: 2, title: "Conciliacao bancaria", client_name: "Cliente Aurora", status: "blocked", area_id: "contabil", priority: "critica" },
    { id: 3, title: "Admissao mensal", client_name: "Cliente Prisma", status: "running", area_id: "pessoal", priority: "normal", assignee: "Camila Rocha" }
  ],
  summary: { running: 42, pending: 8, priority: 5, blocked: 3, productivity: 78, quality: 96, done: 128 }
};

export type Priority = "baixa" | "normal" | "alta" | "critica";
export type DemandStatus = "entrada" | "cadastro" | "financeiro" | "triagem" | "em_producao" | "entrega" | "concluida";
export type TaskStatus = "triada" | "em_andamento" | "concluida" | "bloqueada";

export type Office = {
  id: string;
  name: string;
};

export type CustomerContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
};

export type ServiceInterest = "contabil" | "pessoal" | "outro";

export type Customer = {
  id: string;
  officeId: string;
  legalName: string;
  cnpj: string;
  tradeName?: string;
  contractAddress?: string;
  contractCityState?: string;
  contractEmail?: string;
  contacts?: CustomerContact[];
  serviceInterests?: ServiceInterest[];
  otherServiceDescription?: string;
};

export type Demand = {
  id: string;
  title: string;
  officeId: string;
  customerId: string;
  status: DemandStatus;
  priority: Priority;
  description: string;
  dueDate: string;
  createdAt: string;
  financialStatus: string;
};

export type OperationTask = {
  id: string;
  demandId: string;
  departmentId: "contabil" | "pessoal" | "financeiro";
  stationId: string;
  title: string;
  priority: Priority;
  assignee: string;
  status: TaskStatus;
  procedureKey: string;
  elapsedSeconds: number;
};

export type Procedure = {
  stationKey: string;
  text: string;
};

export type ClientAccess = {
  id: string;
  customerId: string;
  email: string;
  password?: string | null;
  createdAt: string;
};

export type ClientLoginResponse = {
  customerId: string;
  customerName: string;
  access_token: string;
  token_type: string;
};

export type ClientPending = {
  id: string;
  customerId: string;
  title: string;
  description: string;
  status: "pendente" | "em_preenchimento" | "enviada";
  createdAt: string;
  formType: "contabil_onboarding";
};

export type CustomerBasicRegistrationResponse = {
  customer: Customer;
  access: ClientAccess | null;
  pending: ClientPending | null;
};

export type ClientPendingsResponse = {
  pendings: ClientPending[];
};

export type AccountingClientCompany = {
  id: string;
  customerId: string;
  pendingId: string;
  companyName: string;
  cnpj: string;
  taxRegime: string;
  spedEcdDelivery: string;
  financialSystemReports: string;
  onlyBankStatements: string;
  banksUsed: string;
  averageBankPages: string;
  hasApplicationStatementsPdf: string;
  accountingDelayed: string;
  wantsAccountingRegularization: string;
  closingFrequency: string;
  systemUsed: string;
  wantsSpedEcdEcf: string;
  spedPeriod: string;
  createdAt: string;
  scopeSummary: string[];
};

export type AccountingClientCompaniesResponse = {
  companies: AccountingClientCompany[];
};

export type OperationState = {
  offices: Office[];
  customers: Customer[];
  demands: Demand[];
  tasks: OperationTask[];
  procedures: Procedure[];
  stationSeconds: Record<string, number>;
  clientAccesses: ClientAccess[];
  clientPendings: ClientPending[];
};

export type TaskTemplate = {
  id: string;
  departmentId: OperationTask["departmentId"];
  stationId: string;
  title: string;
  procedureKey: string;
};

export const clientSessionKey = "purplesoft_client_session_v1";
export const operatorTokenKey = "purplesoft_token";
export const employees = ["Ana Souza", "Bruno Lima", "Camila Rocha", "Diego Martins", "Equipe Fiscal"];

export const departmentCatalog = {
  contabil: {
    title: "Departamento Contabil",
    stations: [
      { id: "conciliacao", title: "Conciliacao Bancaria" },
      { id: "receitas", title: "Receitas" },
      { id: "despesas", title: "Despesas" },
      { id: "ajustes", title: "Ajustes" }
    ]
  },
  pessoal: {
    title: "Departamento Pessoal",
    stations: [
      { id: "admissoes", title: "Admissoes" },
      { id: "rescisoes", title: "Rescisoes" },
      { id: "ferias", title: "Ferias" },
      { id: "folha", title: "Folha de Pagamento" },
      { id: "analise-gestor", title: "Gestão do Setor" }
    ]
  },
  financeiro: {
    title: "Financeiro",
    stations: [
      { id: "documentos", title: "Documentos" },
      { id: "honorarios", title: "Honorarios" },
      { id: "cobrancas", title: "Cobrancas" }
    ]
  }
} as const;

export const taskTemplates: TaskTemplate[] = [
  { id: "conciliacao", departmentId: "contabil", stationId: "conciliacao", title: "Conciliar bancos do mes", procedureKey: "contabil:conciliacao" },
  { id: "receitas", departmentId: "contabil", stationId: "receitas", title: "Conferir receitas e notas emitidas", procedureKey: "contabil:receitas" },
  { id: "despesas", departmentId: "contabil", stationId: "despesas", title: "Classificar despesas e documentos", procedureKey: "contabil:despesas" },
  { id: "ajustes", departmentId: "contabil", stationId: "ajustes", title: "Lancar ajustes de fechamento", procedureKey: "contabil:ajustes" },
  { id: "admissoes", departmentId: "pessoal", stationId: "admissoes", title: "Processar admissoes do periodo", procedureKey: "pessoal:admissoes" },
  { id: "rescisoes", departmentId: "pessoal", stationId: "rescisoes", title: "Conferir rescisoes pendentes", procedureKey: "pessoal:rescisoes" },
  { id: "ferias", departmentId: "pessoal", stationId: "ferias", title: "Programar e validar ferias", procedureKey: "pessoal:ferias" },
  { id: "folha", departmentId: "pessoal", stationId: "folha", title: "Fechar folha de pagamento", procedureKey: "pessoal:folha" }
];

export const initialOperationState: OperationState = {
  offices: [
    { id: "office-1", name: "Escritorio Alfa Contabil" },
    { id: "office-2", name: "Martins & Rocha Consultoria" },
    { id: "office-3", name: "Solucoes Contabeis Horizonte" },
    { id: "office-4", name: "Prime Gestão Empresarial" },
    { id: "office-5", name: "Crescer Assessoria Contabil" },
    { id: "office-6", name: "Nova Era Consultoria" },
    { id: "office-7", name: "Vetor BPO e Contabilidade" },
    { id: "office-8", name: "Integra Escritorios Associados" }
  ],
  customers: [
    {
      id: "customer-1",
      officeId: "office-1",
      legalName: "Aurora Comercio de Alimentos Ltda",
      cnpj: "12.345.678/0001-90",
      tradeName: "Aurora Alimentos",
      contractAddress: "Av. Central, 1200",
      contractCityState: "Sao Paulo/SP",
      contractEmail: "contratos@aurora.com.br",
      contacts: [{ id: "contact-1", name: "Mariana Costa", role: "Financeiro", phone: "(11) 99999-1000", email: "mariana@aurora.com.br" }],
      serviceInterests: ["contabil", "pessoal"]
    },
    {
      id: "customer-2",
      officeId: "office-1",
      legalName: "Prisma Tecnologia e Servicos Ltda",
      cnpj: "22.987.654/0001-10",
      tradeName: "Prisma Tech",
      contacts: [{ id: "contact-2", name: "Renato Alves", role: "Socio administrador", phone: "(11) 98888-2200", email: "renato@prisma.com.br" }],
      serviceInterests: ["pessoal"]
    },
    {
      id: "customer-3",
      officeId: "office-2",
      legalName: "Horizonte Transportes Ltda",
      cnpj: "33.222.111/0001-44",
      tradeName: "Horizonte",
      contacts: [{ id: "contact-3", name: "Paula Martins", role: "Diretora", phone: "(21) 97777-3300", email: "paula@horizonte.com.br" }],
      serviceInterests: ["contabil"]
    },
    { id: "customer-4", officeId: "office-1", legalName: "Verde Campo Produtos Naturais Ltda", tradeName: "Verde Campo", cnpj: "41.208.763/0001-05", serviceInterests: ["contabil"], contacts: [{ id: "contact-4", name: "Juliana Freitas", role: "Administradora", phone: "(11) 97777-4411", email: "juliana@verdecampo.com.br" }] },
    { id: "customer-5", officeId: "office-1", legalName: "Metalurgica Sao Bento Ltda", tradeName: "MSB Industria", cnpj: "67.390.128/0001-20", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-6", officeId: "office-2", legalName: "Clinica Bem Viver Ltda", tradeName: "Bem Viver", cnpj: "18.524.936/0001-64", serviceInterests: ["pessoal"], contacts: [{ id: "contact-6", name: "Carolina Nunes", role: "Gestora", phone: "(21) 98888-1212", email: "carolina@bemviver.com.br" }] },
    { id: "customer-7", officeId: "office-2", legalName: "Rota Sul Logistica Integrada Ltda", tradeName: "Rota Sul", cnpj: "56.843.192/0001-83", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-8", officeId: "office-2", legalName: "Atelie Casa Clara Ltda", tradeName: "Casa Clara", cnpj: "29.671.405/0001-18", serviceInterests: ["outro"], otherServiceDescription: "Gestao financeira" },
    { id: "customer-9", officeId: "office-3", legalName: "Agropecuaria Santa Luzia Ltda", tradeName: "Santa Luzia Agro", cnpj: "74.156.239/0001-47", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-10", officeId: "office-3", legalName: "Ponto Certo Comercio de Roupas Ltda", tradeName: "Ponto Certo", cnpj: "35.902.671/0001-09", serviceInterests: ["contabil"] },
    { id: "customer-11", officeId: "office-3", legalName: "Construtora Pedra Alta Ltda", tradeName: "Pedra Alta", cnpj: "63.218.457/0001-76", serviceInterests: ["pessoal"] },
    { id: "customer-12", officeId: "office-4", legalName: "Educa Mais Cursos Livres Ltda", tradeName: "Educa Mais", cnpj: "15.847.320/0001-38", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-13", officeId: "office-4", legalName: "Brava Comunicacao Digital Ltda", tradeName: "Brava Digital", cnpj: "48.391.625/0001-91", serviceInterests: ["contabil"] },
    { id: "customer-14", officeId: "office-4", legalName: "Mercado Boa Compra Ltda", tradeName: "Boa Compra", cnpj: "26.735.184/0001-52", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-15", officeId: "office-5", legalName: "Fabrica de Moveis Nobre Ltda", tradeName: "Moveis Nobre", cnpj: "59.124.867/0001-36", serviceInterests: ["contabil"] },
    { id: "customer-16", officeId: "office-5", legalName: "Sabor da Serra Restaurante Ltda", tradeName: "Sabor da Serra", cnpj: "32.680.419/0001-75", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-17", officeId: "office-6", legalName: "Orbita Sistemas Empresariais Ltda", tradeName: "Orbita Sistemas", cnpj: "71.493.208/0001-62", serviceInterests: ["pessoal"] },
    { id: "customer-18", officeId: "office-6", legalName: "Lavanderia Central Express Ltda", tradeName: "Central Express", cnpj: "24.518.697/0001-14", serviceInterests: ["contabil"] },
    { id: "customer-19", officeId: "office-7", legalName: "Alpha Servicos de Engenharia Ltda", tradeName: "Alpha Engenharia", cnpj: "46.702.831/0001-40", serviceInterests: ["contabil", "pessoal"] },
    { id: "customer-20", officeId: "office-7", legalName: "Doces da Vila Industria Ltda", tradeName: "Doces da Vila", cnpj: "19.865.204/0001-87", serviceInterests: ["outro"], otherServiceDescription: "BPO financeiro" },
    { id: "customer-21", officeId: "office-8", legalName: "Grupo Litoral Comercio e Servicos Ltda", tradeName: "Grupo Litoral", cnpj: "68.247.915/0001-23", serviceInterests: ["contabil"] },
    { id: "customer-22", officeId: "office-8", legalName: "Instituto Novo Caminho Ltda", tradeName: "Novo Caminho", cnpj: "37.591.426/0001-68", serviceInterests: ["pessoal"] }
  ],
  demands: [
    {
      id: "demand-1",
      title: "Fechamento mensal 05/2026",
      officeId: "office-1",
      customerId: "customer-1",
      status: "em_producao",
      priority: "alta",
      description: "Fechamento contabil e folha mensal com prazo curto.",
      dueDate: "2026-06-20",
      createdAt: "2026-06-10",
      financialStatus: "honorarios em dia"
    },
    {
      id: "demand-2",
      title: "Regularizacao admissional",
      officeId: "office-1",
      customerId: "customer-2",
      status: "triagem",
      priority: "normal",
      description: "Cliente enviou novos colaboradores para cadastro e conferencia.",
      dueDate: "2026-06-18",
      createdAt: "2026-06-11",
      financialStatus: "documentos financeiros pendentes"
    },
    {
      id: "demand-3",
      title: "Entrega de demonstrativos gerenciais",
      officeId: "office-2",
      customerId: "customer-3",
      status: "entrega",
      priority: "critica",
      description: "Consolidar demonstrativos e liberar entrega final ao escritorio.",
      dueDate: "2026-06-14",
      createdAt: "2026-06-09",
      financialStatus: "liberado"
    }
  ],
  tasks: [
    { id: "task-1", demandId: "demand-1", departmentId: "contabil", stationId: "conciliacao", title: "Conciliar bancos do mes", priority: "alta", assignee: "Ana Souza", status: "em_andamento", procedureKey: "contabil:conciliacao", elapsedSeconds: 1320 },
    { id: "task-2", demandId: "demand-1", departmentId: "contabil", stationId: "receitas", title: "Conferir receitas e notas emitidas", priority: "alta", assignee: "Bruno Lima", status: "triada", procedureKey: "contabil:receitas", elapsedSeconds: 0 },
    { id: "task-3", demandId: "demand-1", departmentId: "pessoal", stationId: "folha", title: "Fechar folha de pagamento", priority: "alta", assignee: "Camila Rocha", status: "triada", procedureKey: "pessoal:folha", elapsedSeconds: 0 },
    { id: "task-4", demandId: "demand-3", departmentId: "contabil", stationId: "ajustes", title: "Revisar ajustes finais", priority: "critica", assignee: "Diego Martins", status: "concluida", procedureKey: "contabil:ajustes", elapsedSeconds: 2410 },
    { id: "task-5", demandId: "demand-3", departmentId: "pessoal", stationId: "ferias", title: "Validar provisao de ferias", priority: "critica", assignee: "Camila Rocha", status: "concluida", procedureKey: "pessoal:ferias", elapsedSeconds: 980 }
  ],
  procedures: [
    { stationKey: "contabil:conciliacao", text: "Baixar extratos, importar OFX, comparar saldos e marcar divergencias antes de liberar receitas/despesas." },
    { stationKey: "contabil:receitas", text: "Conferir notas emitidas, receitas recorrentes e impostos destacados antes da consolidacao." },
    { stationKey: "pessoal:folha", text: "Conferir eventos, descontos, beneficios e bases de encargos antes de concluir a folha." }
  ],
  stationSeconds: {
    "contabil:conciliacao": 3600,
    "contabil:ajustes": 2800,
    "pessoal:folha": 2100
  },
  clientAccesses: [],
  clientPendings: [
    {
      id: "pending-1",
      customerId: "customer-1",
      title: "Cadastro inicial para servico contabil",
      description: "Preencha as informacoes iniciais para prepararmos o contrato e a implantacao contabil.",
      status: "pendente",
      createdAt: "2026-06-10",
      formType: "contabil_onboarding"
    },
    {
      id: "pending-2",
      customerId: "customer-3",
      title: "Cadastro inicial para servico contabil",
      description: "Preencha as informacoes iniciais para prepararmos o contrato e a implantacao contabil.",
      status: "pendente",
      createdAt: "2026-06-10",
      formType: "contabil_onboarding"
    }
  ]
};

export function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeOperationState(state: OperationState): OperationState {
  return {
    ...initialOperationState,
    ...state,
    offices: state.offices ?? [],
    customers: state.customers ?? [],
    demands: state.demands ?? [],
    tasks: state.tasks ?? [],
    procedures: state.procedures ?? [],
    stationSeconds: state.stationSeconds ?? {},
    clientAccesses: (state.clientAccesses ?? []).map((access) => ({ ...access, password: null })),
    clientPendings: state.clientPendings ?? []
  };
}

export function loadOperationState(): OperationState {
  return {
    offices: [],
    customers: [],
    demands: [],
    tasks: [],
    procedures: [],
    stationSeconds: {},
    clientAccesses: [],
    clientPendings: []
  };
}

export function useOperationState() {
  const [state, setState] = useState<OperationState>(() => loadOperationState());

  useEffect(() => {
    async function loadRegistrationsFromApi() {
      try {
        const [officesResponse, customersResponse] = await Promise.all([
          fetch(`${API_URL}/offices`, { headers: authHeaders() }),
          fetch(`${API_URL}/customers`, { headers: authHeaders() })
        ]);
        if (!officesResponse.ok || !customersResponse.ok) return;
        const offices = await officesResponse.json() as { offices: Office[] };
        const customers = await customersResponse.json() as { customers: Customer[] };
        setState((current) => ({ ...current, offices: offices.offices, customers: customers.customers }));
      } catch {
        // A tela continua com o estado inicial quando a API ainda nao estiver disponivel.
      }
    }
    void loadRegistrationsFromApi();
  }, []);

  const commit = useCallback((updater: (current: OperationState) => OperationState) => {
    setState((current) => {
      const next = updater(current);
      return next;
    });
  }, []);

  return { state, commit };
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function officeName(state: OperationState, officeId: string) {
  return state.offices.find((office) => office.id === officeId)?.name ?? "Escritorio nao localizado";
}

export function customerName(state: OperationState, customerId: string) {
  return state.customers.find((customer) => customer.id === customerId)?.legalName ?? "Cliente nao localizado";
}

export function demandProgress(state: OperationState, demandId: string) {
  const tasks = state.tasks.filter((task) => task.demandId === demandId);
  const done = tasks.filter((task) => task.status === "concluida").length;
  return { total: tasks.length, done };
}

export function useOperationMap() {
  const [data, setData] = useState<OperationMap>(fallbackMap);

  useEffect(() => {
    fetch(`${API_URL}/operation-map`, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : fallbackMap))
      .then(setData)
      .catch(() => setData(fallbackMap));
  }, []);

  return data;
}

type UserFilterState = {
  employees: Employee[];
  assignee: string;
  setAssignee: (assignee: string) => void;
};

const UserFilterContext = createContext<UserFilterState | null>(null);

export function UserFilterProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignee, setAssignee] = useState("todos");

  useEffect(() => {
    fetch(`${API_URL}/employees`, { headers: authHeaders() })
      .then((response) => response.ok ? response.json() : { employees: [] })
      .then((body: { employees: Employee[] }) => setEmployees(body.employees))
      .catch(() => setEmployees([]));
  }, []);

  const value = useMemo(() => ({ employees, assignee, setAssignee }), [employees, assignee]);
  return createElement(UserFilterContext.Provider, { value }, children);
}

export function useUserFilter() {
  const context = useContext(UserFilterContext);
  if (!context) throw new Error("O filtro global de usuário deve estar dentro do UserFilterProvider.");
  return context;
}

export function useFilteredOperationMap() {
  const map = useOperationMap();
  const { assignee } = useUserFilter();
  return useMemo(() => assignee === "todos" ? map : { ...map, tasks: map.tasks.filter((task) => task.assignee === assignee) }, [map, assignee]);
}

export function isLoggedIn() {
  const token = localStorage.getItem(operatorTokenKey);
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    const valid = typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
    if (valid) return true;
  } catch {
    // Tokens ausentes, malformados ou antigos devem iniciar uma nova sessão.
  }

  localStorage.removeItem(operatorTokenKey);
  localStorage.removeItem("purplesoft_user");
  return false;
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem(operatorTokenKey);
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

export function clientAuthHeaders(extra?: HeadersInit): HeadersInit {
  const stored = localStorage.getItem(clientSessionKey);
  if (!stored) return { ...extra };
  try {
    const session = JSON.parse(stored) as { accessToken?: string };
    return session.accessToken ? { ...extra, Authorization: `Bearer ${session.accessToken}` } : { ...extra };
  } catch {
    return { ...extra };
  }
}
