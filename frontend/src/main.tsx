import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Factory,
  FileText,
  GitBranch,
  Home,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  PackageCheck,
  Play,
  Plus,
  Save,
  PlayCircle,
  Settings,
  ShieldCheck,
  Timer,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  Zap
} from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import FactoryDashboard from "./pages/FactoryDashboard";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8088";

type WorkArea = {
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

type Task = {
  id: number;
  title: string;
  client_name: string;
  status: string;
  area_id: string;
};

type OperationMap = {
  areas: WorkArea[];
  tasks: Task[];
  summary: Record<string, number>;
};

const processPoints = [
  { id: "p1", label: "1", name: "Entrada", x: 9, y: 34 },
  { id: "p2", label: "2", name: "Cadastro", x: 22, y: 34 },
  { id: "p3", label: "3", name: "Financeiro", x: 36, y: 34 },
  { id: "p4", label: "4", name: "Triagem", x: 50, y: 33 },
  { id: "p5", label: "5", name: "Contabil", x: 66, y: 26 },
  { id: "p6", label: "6", name: "Pessoal", x: 64, y: 62 },
  { id: "p7", label: "7", name: "Consolidacao", x: 81, y: 48 },
  { id: "p8", label: "8", name: "Entrega", x: 93, y: 42 }
];

const departmentZones = [
  { id: "contabil-zone", title: "Departamento Contabil", subtitle: "Receitas · Despesas · Ajustes", x: 55, y: 9, width: 25, height: 29 },
  { id: "pessoal-zone", title: "Departamento Pessoal", subtitle: "Admissoes · Rescisoes · Folha", x: 53, y: 49, width: 26, height: 28 }
];

const fallbackMap: OperationMap = {
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
    { id: 1, title: "Fechamento contabil", client_name: "Escritorio Alfa", status: "running", area_id: "contabil" },
    { id: 2, title: "Conciliacao bancaria", client_name: "Cliente Aurora", status: "blocked", area_id: "contabil" },
    { id: 3, title: "Admissao mensal", client_name: "Cliente Prisma", status: "running", area_id: "pessoal" }
  ],
  summary: { running: 42, pending: 8, priority: 5, blocked: 3, productivity: 78, quality: 96, done: 128 }
};

type Priority = "baixa" | "normal" | "alta" | "critica";
type DemandStatus = "entrada" | "cadastro" | "financeiro" | "triagem" | "em_producao" | "entrega" | "concluida";
type TaskStatus = "triada" | "em_andamento" | "concluida" | "bloqueada";

type Office = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  officeId: string;
  legalName: string;
  cnpj: string;
};

type Demand = {
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

type OperationTask = {
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

type Procedure = {
  stationKey: string;
  text: string;
};

type OperationState = {
  offices: Office[];
  customers: Customer[];
  demands: Demand[];
  tasks: OperationTask[];
  procedures: Procedure[];
  stationSeconds: Record<string, number>;
};

type TaskTemplate = {
  id: string;
  departmentId: OperationTask["departmentId"];
  stationId: string;
  title: string;
  procedureKey: string;
};

const storageKey = "purplesoft_operation_state_v1";
const employees = ["Ana Souza", "Bruno Lima", "Camila Rocha", "Diego Martins", "Equipe Fiscal"];

const departmentCatalog = {
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
      { id: "folha", title: "Folha de Pagamento" }
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

const taskTemplates: TaskTemplate[] = [
  { id: "conciliacao", departmentId: "contabil", stationId: "conciliacao", title: "Conciliar bancos do mes", procedureKey: "contabil:conciliacao" },
  { id: "receitas", departmentId: "contabil", stationId: "receitas", title: "Conferir receitas e notas emitidas", procedureKey: "contabil:receitas" },
  { id: "despesas", departmentId: "contabil", stationId: "despesas", title: "Classificar despesas e documentos", procedureKey: "contabil:despesas" },
  { id: "ajustes", departmentId: "contabil", stationId: "ajustes", title: "Lancar ajustes de fechamento", procedureKey: "contabil:ajustes" },
  { id: "admissoes", departmentId: "pessoal", stationId: "admissoes", title: "Processar admissoes do periodo", procedureKey: "pessoal:admissoes" },
  { id: "rescisoes", departmentId: "pessoal", stationId: "rescisoes", title: "Conferir rescisoes pendentes", procedureKey: "pessoal:rescisoes" },
  { id: "ferias", departmentId: "pessoal", stationId: "ferias", title: "Programar e validar ferias", procedureKey: "pessoal:ferias" },
  { id: "folha", departmentId: "pessoal", stationId: "folha", title: "Fechar folha de pagamento", procedureKey: "pessoal:folha" }
];

const initialOperationState: OperationState = {
  offices: [
    { id: "office-1", name: "Escritorio Alfa Contabil" },
    { id: "office-2", name: "Martins & Rocha Consultoria" }
  ],
  customers: [
    { id: "customer-1", officeId: "office-1", legalName: "Aurora Comercio de Alimentos Ltda", cnpj: "12.345.678/0001-90" },
    { id: "customer-2", officeId: "office-1", legalName: "Prisma Tecnologia e Servicos Ltda", cnpj: "22.987.654/0001-10" },
    { id: "customer-3", officeId: "office-2", legalName: "Horizonte Transportes Ltda", cnpj: "33.222.111/0001-44" }
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
  }
};

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadOperationState(): OperationState {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return initialOperationState;
  try {
    return JSON.parse(stored) as OperationState;
  } catch {
    return initialOperationState;
  }
}

function useOperationState() {
  const [state, setState] = useState<OperationState>(() => loadOperationState());

  const commit = useCallback((updater: (current: OperationState) => OperationState) => {
    setState((current) => {
      const next = updater(current);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  return { state, commit };
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function officeName(state: OperationState, officeId: string) {
  return state.offices.find((office) => office.id === officeId)?.name ?? "Escritorio nao localizado";
}

function customerName(state: OperationState, customerId: string) {
  return state.customers.find((customer) => customer.id === customerId)?.legalName ?? "Cliente nao localizado";
}

function demandProgress(state: OperationState, demandId: string) {
  const tasks = state.tasks.filter((task) => task.demandId === demandId);
  const done = tasks.filter((task) => task.status === "concluida").length;
  return { total: tasks.length, done };
}

function useOperationMap() {
  const [data, setData] = useState<OperationMap>(fallbackMap);

  useEffect(() => {
    fetch(`${API_URL}/operation-map`)
      .then((response) => (response.ok ? response.json() : fallbackMap))
      .then(setData)
      .catch(() => setData(fallbackMap));
  }, []);

  return data;
}

function isLoggedIn() {
  return Boolean(localStorage.getItem("purplesoft_token"));
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("gerente@purplebpo.com.br");
  const [password, setPassword] = useState("purple123");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Falha no login");
      const body = await response.json();
      localStorage.setItem("purplesoft_token", body.access_token);
      localStorage.setItem("purplesoft_user", body.name);
      navigate("/");
    } catch {
      localStorage.setItem("purplesoft_token", "demo-token");
      localStorage.setItem("purplesoft_user", "Gerente Operacional");
      navigate("/");
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark"><Factory size={30} /></div>
        <p className="eyebrow">PurpleSoft</p>
        <h1>Linha operacional viva para BPO</h1>
        <p>Entre na fabrica visual de demandas, acompanhe gargalos e avance cada tarefa pelo fluxo.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <span className="form-error">{error}</span>}
          <button type="submit"><Lock size={18} /> Entrar na operacao</button>
        </form>
      </section>
      <section className="login-visual" aria-hidden="true">
        <div className="pulse-grid" />
        <div className="mini-factory">
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const items = [
    [Home, "Visao Geral", "/"],
    [ClipboardList, "Demandas", "/area/entrada"],
    [Boxes, "Producao", "/area/triagem"],
    [BarChart3, "Relatorios", "/reports"],
    [Activity, "Indicadores", "/indicators"],
    [Settings, "Configuracoes", "/settings"],
    [CircleHelp, "Ajuda", "/help"]
  ] as const;

  return (
    <div className={`app-shell ${leftCollapsed ? "left-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="sidebar-toggle" onClick={() => setLeftCollapsed((value) => !value)} title={leftCollapsed ? "Expandir menu" : "Recolher menu"}>
          {leftCollapsed ? <ChevronRight /> : <Menu />}
        </button>
        <nav>
          {items.map(([Icon, label, to]) => (
            <Link to={to} key={label} title={label}>
              <Icon size={23} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>Linha de Producao Operacional</h1>
            <p>Fluxo visual para BPO contabil e departamento pessoal</p>
          </div>
          <div className="topbar-actions">
            <div className="score"><Trophy size={28} /><span>Nivel da Operacao<strong>Ouro</strong></span></div>
            <div className="score"><Zap size={28} /><span>Pontuacao<strong>2.560 pts</strong></span></div>
            <button className="user-button"><UserRound /> {localStorage.getItem("purplesoft_user") ?? "Gerente"}</button>
            <button className="icon-button" onClick={() => { localStorage.clear(); navigate("/login"); }} title="Sair"><LogOut /></button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function Dashboard() {
  const map = useOperationMap();
  const [rightCollapsed, setRightCollapsed] = useState(false);
  return (
    <Shell>
      <main className={`dashboard ${rightCollapsed ? "right-collapsed" : ""}`}>
        <section className="factory-floor">
          <FactoryMap areas={map.areas} />
          <KpiStrip summary={map.summary} />
        </section>
        <aside className="right-panel">
          <button className="panel-toggle" onClick={() => setRightCollapsed((value) => !value)} title={rightCollapsed ? "Expandir resumo" : "Recolher resumo"}>
            {rightCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </button>
          <div className="right-panel-content">
          <Summary summary={map.summary} />
          <StatusLegend />
          <DemandCard tasks={map.tasks} />
          </div>
        </aside>
      </main>
    </Shell>
  );
}

function FactoryMap({ areas }: { areas: WorkArea[] }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      dragRef.current.moved = true;
    }
    setPan({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    if (event.currentTarget.hasPointerCapture(dragRef.current.pointerId)) {
      event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  }

  return (
    <div
      className={`factory-map ${isDragging ? "dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div className="factory-canvas" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}>
      {departmentZones.map((zone) => (
        <section
          className="department-zone"
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`
          }}
          key={zone.id}
          aria-label={zone.title}
        >
          <strong>{zone.title}</strong>
          <span>{zone.subtitle}</span>
        </section>
      ))}
      <svg viewBox="0 0 1000 560" role="img" aria-label="Mapa operacional clicavel">
        <defs>
          <linearGradient id="belt" x1="0" x2="1">
            <stop offset="0%" stopColor="#304866" />
            <stop offset="100%" stopColor="#162436" />
          </linearGradient>
          <pattern id="arrows" width="42" height="22" patternUnits="userSpaceOnUse">
            <path d="M8 5 L18 11 L8 17" fill="none" stroke="#57a6ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </pattern>
        </defs>
        <rect width="1000" height="560" rx="18" fill="#edf4fb" />
        <path d="M65 142 H505 C545 142 548 168 548 187" className="belt-shadow" />
        <path d="M548 187 C590 142 635 125 735 125 H790 C835 125 855 145 855 188 V268 C855 308 875 330 930 330" className="belt-shadow" />
        <path d="M548 187 C585 315 650 360 790 360 H930" className="belt-shadow" />
        <path d="M65 142 H505 C545 142 548 168 548 187" className="belt-path" />
        <path d="M548 187 C590 142 635 125 735 125 H790 C835 125 855 145 855 188 V268 C855 308 875 330 930 330" className="belt-path" />
        <path d="M548 187 C585 315 650 360 790 360 H930" className="belt-path" />
        <path d="M65 142 H505 C545 142 548 168 548 187" className="belt-arrows" />
        <path d="M548 187 C590 142 635 125 735 125 H790 C835 125 855 145 855 188 V268 C855 308 875 330 930 330" className="belt-arrows slow" />
        <path d="M548 187 C585 315 650 360 790 360 H930" className="belt-arrows slow" />
        <rect x="52" y="400" width="258" height="110" rx="16" fill="#d8e7f2" stroke="#b7c9d8" />
        <text x="94" y="455" className="floor-note">FOCO + FLUXO + RESULTADO</text>
      </svg>
      {areas.map((area, index) => (
        <Link
          className={`workstation-node ${area.kind} ${area.status}`}
          style={{ left: `${area.position_x}%`, top: `${area.position_y}%` }}
          to={`/area/${area.id}`}
          key={area.id}
        >
          <span className="station-number">{index + 1}</span>
          <span className="station-label">{area.name}</span>
          {area.kind === "department" ? (
            <span className="department-machine">
              {(area.id === "pessoal" ? departmentCatalog.pessoal.stations : departmentCatalog.contabil.stations).map((station) => (
                <span className="inner-lane" key={station.id}>
                  <span className="lane-icon" />
                  <span>{station.title}</span>
                  <span className="lane-flow" />
                  <span className="lane-doc" />
                </span>
              ))}
            </span>
          ) : (
            <span className={`machine-body ${area.kind}`}>
              <span className="machine-light" />
              <span className="machine-screen">
                {area.kind === "intake" && <FileText />}
                {area.id === "cadastro" && <UserRound />}
                {area.id === "financeiro" && <CheckCircle2 />}
                {area.id === "triagem" && <GitBranch />}
                {area.id === "consolidacao" && <BarChart3 />}
                {area.kind === "delivery" && <PackageCheck />}
              </span>
              <span className="machine-base" />
            </span>
          )}
          <small className="station-count">{area.wip} em fila · {area.pending} pend.</small>
        </Link>
      ))}
      <div className="operator" />
      <div className="dock-message">Processos padronizados <span /> Times alinhados <span /> Resultados atingidos</div>
      </div>
    </div>
  );
}

function Summary({ summary }: { summary: Record<string, number> }) {
  const cards = [
    [PlayCircle, "Em andamento", summary.running],
    [Bell, "Pendencias", summary.pending],
    [Zap, "Prioridade alta", summary.priority],
    [ShieldCheck, "Bloqueadas", summary.blocked]
  ] as const;
  return (
    <section className="panel">
      <h2>Resumo da Operacao</h2>
      <div className="summary-grid">
        {cards.map(([Icon, label, value]) => (
          <div className="summary-card" key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusLegend() {
  return (
    <section className="panel">
      <h2>Legenda de Status</h2>
      {["Disponivel", "Em andamento", "Pendente de documento", "Concluido"].map((label, index) => (
        <p className={`legend l${index}`} key={label}><span />{label}</p>
      ))}
    </section>
  );
}

function DemandCard({ tasks }: { tasks: Task[] }) {
  const task = tasks[0];
  return (
    <section className="panel demand-card">
      <h2>Exemplo de Demanda</h2>
      <strong>{task?.title ?? "Fechamento contabil"}</strong>
      <p>4/8 pecas concluidas</p>
      <div className="progress"><span /></div>
      <div className="demand-stats">
        <span><CheckCircle2 />2 concluidas</span>
        <span><PlayCircle />2 em andamento</span>
        <span><Bell />2 pendentes</span>
      </div>
    </section>
  );
}

function KpiStrip({ summary }: { summary: Record<string, number> }) {
  return (
    <section className="kpi-strip">
      <span><Activity />Produtividade hoje <strong>{summary.productivity}%</strong></span>
      <span><CheckCircle2 />Qualidade <strong>{summary.quality}%</strong></span>
      <span><PackageCheck />Demandas concluidas <strong>{summary.done}</strong></span>
      <span><Building2 />Escritorios ativos <strong>18</strong></span>
    </section>
  );
}

function AreaPage() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const map = useOperationMap();
  const store = useOperationState();
  const area = useMemo(() => map.areas.find((item) => item.id === areaId), [areaId, map.areas]);

  if (areaId === "entrada") return <EntranceArea store={store} />;
  if (areaId === "cadastro") return <RegistrationArea store={store} />;
  if (areaId === "financeiro") return <FinancialArea store={store} />;
  if (areaId === "triagem") return <TriageArea store={store} />;
  if (areaId === "contabil" || areaId === "pessoal") return <DepartmentArea departmentId={areaId} store={store} />;
  if (areaId === "entrega") return <DeliveryArea store={store} />;

  return (
    <Shell>
      <main className="area-page">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Voltar</button>
        <section className="area-hero">
          <div>
            <p className="eyebrow">Estacao de trabalho</p>
            <h2>{area?.name ?? "Area operacional"}</h2>
            <p>Esta tela fica reservada para montarmos ferramentas, manuais, fila de tarefas e indicadores especificos do setor.</p>
          </div>
          <div className={`status-beacon ${area?.status ?? "running"}`} />
        </section>
        <section className="tool-grid">
          <div><ClipboardList /><strong>Fila de tarefas</strong><span>{area?.wip || 0} itens</span></div>
          <div><UsersRound /><strong>Time responsavel</strong><span>Operacao BPO</span></div>
          <div><BarChart3 /><strong>Indicadores</strong><span>{area?.pending ?? 0} pendencias</span></div>
          <div><CircleHelp /><strong>Manuais</strong><span>Em construcao</span></div>
        </section>
      </main>
    </Shell>
  );
}

function AreaFrame({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <Shell>
      <main className="area-page">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Voltar</button>
        <section className="area-hero compact">
          <div>
            <p className="eyebrow">Estacao operacional</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="hero-icon">{icon}</div>
        </section>
        {children}
      </main>
    </Shell>
  );
}

function EntranceArea({ store }: { store: ReturnType<typeof useOperationState> }) {
  const { state, commit } = store;
  const [form, setForm] = useState({
    officeName: "Escritorio Alfa Contabil",
    customerLegalName: "Nova Industria Solar Ltda",
    cnpj: "44.555.666/0001-77",
    title: "Fechamento mensal 06/2026",
    description: "Demanda recebida com documentos fiscais, folha e conciliacao bancaria.",
    dueDate: "2026-06-25",
    priority: "normal" as Priority
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    commit((current) => {
      const office = current.offices.find((item) => item.name === form.officeName) ?? { id: uniqueId("office"), name: form.officeName };
      const customer = current.customers.find((item) => item.cnpj === form.cnpj) ?? {
        id: uniqueId("customer"),
        officeId: office.id,
        legalName: form.customerLegalName,
        cnpj: form.cnpj
      };
      const demand: Demand = {
        id: uniqueId("demand"),
        title: form.title,
        officeId: office.id,
        customerId: customer.id,
        status: "triagem",
        priority: form.priority,
        description: form.description,
        dueDate: form.dueDate,
        createdAt: new Date().toISOString().slice(0, 10),
        financialStatus: "aguardando validacao"
      };
      return {
        ...current,
        offices: current.offices.some((item) => item.id === office.id) ? current.offices : [...current.offices, office],
        customers: current.customers.some((item) => item.id === customer.id) ? current.customers : [...current.customers, customer],
        demands: [demand, ...current.demands]
      };
    });
  }

  return (
    <AreaFrame title="Entrada da Demanda" subtitle="Recebe o pedido do escritorio e cria o objeto demanda que depois sera fragmentado pela triagem." icon={<ClipboardList />}>
      <section className="ops-grid">
        <form className="ops-panel form-grid" onSubmit={submit}>
          <h3>Nova demanda</h3>
          <label>Escritorio<input value={form.officeName} onChange={(event) => setForm({ ...form, officeName: event.target.value })} /></label>
          <label>Cliente - razao social<input value={form.customerLegalName} onChange={(event) => setForm({ ...form, customerLegalName: event.target.value })} /></label>
          <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
          <label>Titulo da demanda<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Prazo<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
          <label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}><option>baixa</option><option>normal</option><option>alta</option><option>critica</option></select></label>
          <label className="wide">Descricao<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <button type="submit"><Plus size={18} /> Criar demanda e enviar para triagem</button>
        </form>
        <DemandList state={state} title="Demandas recebidas" />
      </section>
    </AreaFrame>
  );
}

function RegistrationArea({ store }: { store: ReturnType<typeof useOperationState> }) {
  const { state, commit } = store;
  const [form, setForm] = useState({ officeName: "Contabilidade Delta", legalName: "Delta Moveis Planejados Ltda", cnpj: "55.333.222/0001-88" });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    commit((current) => {
      const office = current.offices.find((item) => item.name === form.officeName) ?? { id: uniqueId("office"), name: form.officeName };
      const customer = { id: uniqueId("customer"), officeId: office.id, legalName: form.legalName, cnpj: form.cnpj };
      return {
        ...current,
        offices: current.offices.some((item) => item.id === office.id) ? current.offices : [...current.offices, office],
        customers: current.customers.some((item) => item.cnpj === form.cnpj) ? current.customers : [...current.customers, customer]
      };
    });
  }

  return (
    <AreaFrame title="Cadastro" subtitle="Centraliza o cadastro de escritorios e clientes atendidos, antes ou durante a entrada de demandas." icon={<Building2 />}>
      <section className="ops-grid">
        <form className="ops-panel form-grid" onSubmit={submit}>
          <h3>Novo cliente</h3>
          <label>Escritorio<input value={form.officeName} onChange={(event) => setForm({ ...form, officeName: event.target.value })} /></label>
          <label>Razao social<input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label>
          <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
          <button type="submit"><Save size={18} /> Salvar cadastro</button>
        </form>
        <section className="ops-panel">
          <h3>Clientes cadastrados</h3>
          <div className="table-list">
            {state.customers.map((customer) => (
              <article key={customer.id}>
                <strong>{customer.legalName}</strong>
                <span>{customer.cnpj}</span>
                <small>{officeName(state, customer.officeId)}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AreaFrame>
  );
}

function FinancialArea({ store }: { store: ReturnType<typeof useOperationState> }) {
  const { state, commit } = store;
  const [selectedDemand, setSelectedDemand] = useState(state.demands[0]?.id ?? "");
  const [status, setStatus] = useState("liberado");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    commit((current) => ({
      ...current,
      demands: current.demands.map((demand) => demand.id === selectedDemand ? { ...demand, financialStatus: status, status: demand.status === "cadastro" ? "triagem" : demand.status } : demand)
    }));
  }

  return (
    <AreaFrame title="Financeiro" subtitle="Valida documentos financeiros, liberacao comercial e pendencias antes de a demanda seguir no fluxo." icon={<WalletCards />}>
      <section className="ops-grid">
        <form className="ops-panel form-grid" onSubmit={submit}>
          <h3>Validar demanda</h3>
          <label className="wide">Demanda<select value={selectedDemand} onChange={(event) => setSelectedDemand(event.target.value)}>{state.demands.map((demand) => <option value={demand.id} key={demand.id}>{demand.title}</option>)}</select></label>
          <label>Status financeiro<select value={status} onChange={(event) => setStatus(event.target.value)}><option>liberado</option><option>honorarios em dia</option><option>aguardando pagamento</option><option>documentos financeiros pendentes</option></select></label>
          <button type="submit"><Save size={18} /> Atualizar financeiro</button>
        </form>
        <DemandList state={state} title="Fila financeira" />
      </section>
    </AreaFrame>
  );
}

function TriageArea({ store }: { store: ReturnType<typeof useOperationState> }) {
  const { state, commit } = store;
  const triageDemands = state.demands.filter((demand) => demand.status === "triagem" || state.tasks.filter((task) => task.demandId === demand.id).length === 0);
  const [selectedDemand, setSelectedDemand] = useState(triageDemands[0]?.id ?? state.demands[0]?.id ?? "");
  const [assignee, setAssignee] = useState(employees[0]);
  const [priority, setPriority] = useState<Priority>("normal");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(["conciliacao", "receitas", "folha"]);

  function toggleTemplate(templateId: string) {
    setSelectedTemplates((current) => current.includes(templateId) ? current.filter((item) => item !== templateId) : [...current, templateId]);
  }

  function distribute() {
    commit((current) => {
      const demand = current.demands.find((item) => item.id === selectedDemand);
      if (!demand) return current;
      const newTasks = taskTemplates
        .filter((template) => selectedTemplates.includes(template.id))
        .map((template) => ({
          id: uniqueId("task"),
          demandId: demand.id,
          departmentId: template.departmentId,
          stationId: template.stationId,
          title: template.title,
          priority,
          assignee,
          status: "triada" as TaskStatus,
          procedureKey: template.procedureKey,
          elapsedSeconds: 0
        }));
      return {
        ...current,
        demands: current.demands.map((item) => item.id === demand.id ? { ...item, status: "em_producao", priority } : item),
        tasks: [...newTasks, ...current.tasks.filter((task) => task.demandId !== demand.id)]
      };
    });
  }

  return (
    <AreaFrame title="Triagem" subtitle="O gestor fragmenta uma demanda em tarefas e distribui cada uma para a esteira interna do departamento certo." icon={<GitBranch />}>
      <section className="ops-grid">
        <section className="ops-panel form-grid">
          <h3>Distribuir demanda</h3>
          <label className="wide">Demanda<select value={selectedDemand} onChange={(event) => setSelectedDemand(event.target.value)}>{state.demands.map((demand) => <option value={demand.id} key={demand.id}>{demand.title}</option>)}</select></label>
          <label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option>baixa</option><option>normal</option><option>alta</option><option>critica</option></select></label>
          <label>Funcionario<select value={assignee} onChange={(event) => setAssignee(event.target.value)}>{employees.map((employee) => <option key={employee}>{employee}</option>)}</select></label>
          <div className="wide checklist">
            {taskTemplates.map((template) => (
              <label key={template.id}>
                <input type="checkbox" checked={selectedTemplates.includes(template.id)} onChange={() => toggleTemplate(template.id)} />
                <span>{template.title}</span>
                <small>{departmentCatalog[template.departmentId].title}</small>
              </label>
            ))}
          </div>
          <button type="button" onClick={distribute}><GitBranch size={18} /> Criar tarefas e distribuir</button>
        </section>
        <DemandList state={state} title="Demandas para triagem" />
      </section>
    </AreaFrame>
  );
}

function DepartmentArea({ departmentId, store }: { departmentId: "contabil" | "pessoal"; store: ReturnType<typeof useOperationState> }) {
  const { state } = store;
  const department = departmentCatalog[departmentId];
  return (
    <AreaFrame title={department.title} subtitle="Cada esteira interna representa uma estacao de trabalho com fila, procedimento operacional e medicao de tempo." icon={<Boxes />}>
      <section className="station-belt">
        {department.stations.map((station) => {
          const stationKey = `${departmentId}:${station.id}`;
          const tasks = state.tasks.filter((task) => task.departmentId === departmentId && task.stationId === station.id && task.status !== "concluida");
          const procedure = state.procedures.find((item) => item.stationKey === stationKey);
          return (
            <Link className="station-card" to={`/area/${departmentId}/station/${station.id}`} key={station.id}>
              <span className="machine-light" />
              <strong>{station.title}</strong>
              <small>{tasks.length} tarefas abertas</small>
              <p>{procedure?.text ?? "Procedimento operacional ainda nao definido."}</p>
            </Link>
          );
        })}
      </section>
    </AreaFrame>
  );
}

function WorkstationPage() {
  const { areaId, stationId } = useParams();
  const navigate = useNavigate();
  const departmentId = areaId === "pessoal" ? "pessoal" : "contabil";
  const station = departmentCatalog[departmentId].stations.find((item) => item.id === stationId);
  const store = useOperationState();
  const { state, commit } = store;
  const stationKey = `${departmentId}:${stationId}`;
  const tasks = state.tasks.filter((task) => task.departmentId === departmentId && task.stationId === stationId && task.status !== "concluida");
  const [procedureText, setProcedureText] = useState(state.procedures.find((item) => item.stationKey === stationKey)?.text ?? "");
  const [activeTaskId, setActiveTaskId] = useState<string>("");
  const [stationSeconds, setStationSeconds] = useState(0);
  const [taskSeconds, setTaskSeconds] = useState(0);
  const activeTask = state.tasks.find((task) => task.id === activeTaskId);
  const stationSecondsRef = useRef(0);
  const taskSecondsRef = useRef(0);
  const activeTaskRef = useRef("");

  useEffect(() => {
    activeTaskRef.current = activeTaskId;
  }, [activeTaskId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStationSeconds((value) => {
        stationSecondsRef.current = value + 1;
        return value + 1;
      });
      if (activeTaskRef.current) {
        setTaskSeconds((value) => {
          taskSecondsRef.current = value + 1;
          return value + 1;
        });
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      commit((current) => ({
        ...current,
        stationSeconds: {
          ...current.stationSeconds,
          [stationKey]: (current.stationSeconds[stationKey] ?? 0) + stationSecondsRef.current
        },
        tasks: current.tasks.map((task) => task.id === activeTaskRef.current ? { ...task, elapsedSeconds: task.elapsedSeconds + taskSecondsRef.current } : task)
      }));
    };
  }, [commit, stationKey]);

  function saveProcedure() {
    commit((current) => ({
      ...current,
      procedures: [
        ...current.procedures.filter((item) => item.stationKey !== stationKey),
        { stationKey, text: procedureText }
      ]
    }));
  }

  function startTask(taskId: string) {
    setActiveTaskId(taskId);
    setTaskSeconds(0);
    taskSecondsRef.current = 0;
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "em_andamento" } : task)
    }));
  }

  function completeActiveTask() {
    if (!activeTask) return;
    const elapsedNow = taskSecondsRef.current;
    commit((current) => {
      const updatedTasks = current.tasks.map((task) => task.id === activeTask.id ? { ...task, status: "concluida" as TaskStatus, elapsedSeconds: task.elapsedSeconds + elapsedNow } : task);
      const demandTasks = updatedTasks.filter((task) => task.demandId === activeTask.demandId);
      const allDone = demandTasks.length > 0 && demandTasks.every((task) => task.status === "concluida");
      return {
        ...current,
        tasks: updatedTasks,
        demands: current.demands.map((demand) => demand.id === activeTask.demandId ? { ...demand, status: allDone ? "entrega" : demand.status } : demand)
      };
    });
    setActiveTaskId("");
    setTaskSeconds(0);
    taskSecondsRef.current = 0;
    const sameStationNext = tasks.find((task) => task.id !== activeTask.id);
    const sameDemandNext = state.tasks.find((task) => task.demandId === activeTask.demandId && task.id !== activeTask.id && task.status !== "concluida");
    if (sameStationNext && window.confirm("Tarefa concluida. Ir para a proxima tarefa da mesma estacao?")) {
      startTask(sameStationNext.id);
    } else if (sameDemandNext && window.confirm("Ir para a proxima tarefa da mesma demanda?")) {
      navigate(`/area/${sameDemandNext.departmentId}/station/${sameDemandNext.stationId}`);
    }
  }

  return (
    <AreaFrame title={station?.title ?? "Estacao de trabalho"} subtitle="Ao entrar na estacao o tempo da estacao passa a contar. Ao iniciar uma tarefa, o tempo da tarefa tambem passa a contar." icon={<Timer />}>
      <section className="ops-grid station-workspace">
        <section className="ops-panel">
          <h3>Tempo em andamento</h3>
          <div className="timer-grid">
            <span><Timer /> Estacao <strong>{formatDuration(stationSeconds)}</strong></span>
            <span><PlayCircle /> Tarefa <strong>{formatDuration(taskSeconds)}</strong></span>
          </div>
          <h3>Procedimento operacional</h3>
          <textarea className="procedure-box" value={procedureText} onChange={(event) => setProcedureText(event.target.value)} />
          <button type="button" onClick={saveProcedure}><Save size={18} /> Salvar procedimento</button>
        </section>
        <section className="ops-panel">
          <h3>Fila da estacao</h3>
          <div className="task-list">
            {tasks.map((task) => (
              <article className={`task-card ${activeTaskId === task.id ? "active" : ""}`} key={task.id}>
                <strong>{task.title}</strong>
                <span>{customerName(state, state.demands.find((demand) => demand.id === task.demandId)?.customerId ?? "")}</span>
                <small>{task.priority} · {task.assignee} · acumulado {formatDuration(task.elapsedSeconds)}</small>
                <div className="task-actions">
                  <button type="button" onClick={() => startTask(task.id)}><Play size={16} /> Iniciar</button>
                  <button type="button" onClick={completeActiveTask} disabled={activeTaskId !== task.id}><CheckCircle2 size={16} /> Concluir</button>
                </div>
              </article>
            ))}
            {tasks.length === 0 && <p className="empty-state">Sem tarefas abertas nesta estacao.</p>}
          </div>
        </section>
      </section>
    </AreaFrame>
  );
}

function DeliveryArea({ store }: { store: ReturnType<typeof useOperationState> }) {
  const { state } = store;
  return (
    <AreaFrame title="Entrega Final" subtitle="Mostra cada demanda como um pacote industrial: total de tarefas, tarefas concluidas e liberacao para entrega ao escritorio." icon={<PackageCheck />}>
      <section className="ops-panel">
        <h3>Demandas em entrega</h3>
        <div className="delivery-list">
          {state.demands.map((demand) => {
            const progress = demandProgress(state, demand.id);
            return (
              <article key={demand.id}>
                <div>
                  <strong>{demand.title}</strong>
                  <span>{officeName(state, demand.officeId)} · {customerName(state, demand.customerId)}</span>
                </div>
                <div className="progress-block">
                  <small>{progress.done}/{progress.total} tarefas concluidas</small>
                  <div className="progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                </div>
                <span className={`status-pill ${progress.total > 0 && progress.done === progress.total ? "done" : ""}`}>{progress.total > 0 && progress.done === progress.total ? "pronta para entregar" : demand.status}</span>
              </article>
            );
          })}
        </div>
      </section>
    </AreaFrame>
  );
}

function DemandList({ state, title }: { state: OperationState; title: string }) {
  return (
    <section className="ops-panel">
      <h3>{title}</h3>
      <div className="table-list">
        {state.demands.map((demand) => {
          const progress = demandProgress(state, demand.id);
          return (
            <article key={demand.id}>
              <strong>{demand.title}</strong>
              <span>{customerName(state, demand.customerId)}</span>
              <small>{demand.status} · {demand.priority} · prazo {demand.dueDate} · {progress.done}/{progress.total} tarefas</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <Shell>
      <main className="area-page">
        <Link className="back-button" to="/"><ArrowLeft size={18} /> Voltar</Link>
        <section className="area-hero">
          <div>
            <p className="eyebrow">Modulo</p>
            <h2>{title}</h2>
            <p>Tela reservada para evoluirmos juntos na proxima etapa do MVP.</p>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><FactoryDashboard /></PrivateRoute>} />
        <Route path="/operation" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/area/:areaId" element={<PrivateRoute><AreaPage /></PrivateRoute>} />
        <Route path="/area/:areaId/station/:stationId" element={<PrivateRoute><WorkstationPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><PlaceholderPage title="Relatorios" /></PrivateRoute>} />
        <Route path="/indicators" element={<PrivateRoute><PlaceholderPage title="Indicadores" /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><PlaceholderPage title="Configuracoes" /></PrivateRoute>} />
        <Route path="/help" element={<PrivateRoute><PlaceholderPage title="Ajuda" /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
