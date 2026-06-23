import React, { useRef, useState } from "react";
import {
  Banknote,
  BarChart3,
  Check,
  FileText,
  LineChart,
  Settings,
  Target,
  TrendingDown,
  User,
  UserCheck,
  Users,
  Workflow
} from "lucide-react";
import "./FactoryDashboard.css";

type MachineKind = "document" | "terminal" | "finance" | "triage";
type LayoutId = "entry" | "register" | "financial" | "triage" | "accounting" | "people" | "consolidation" | "delivery" | "focus";
type Position = { x: number; y: number };
type LayoutState = Record<LayoutId, Position>;
type SocketSide = "in" | "out";
type SocketState = Record<LayoutId, Record<SocketSide, Position>>;
type Connection = { id: string; from: LayoutId; to: LayoutId; tone?: "blue" | "green" };

type Lane = {
  label: string;
  tone: string;
  icon: "bank" | "chart" | "down" | "gear" | "user" | "userOff" | "sun" | "file";
};

const accountingLanes: Lane[] = [
  { label: "Conciliação Bancária", tone: "blue", icon: "bank" },
  { label: "Receitas", tone: "green", icon: "chart" },
  { label: "Despesas", tone: "red", icon: "down" },
  { label: "Ajustes", tone: "purple", icon: "gear" }
];

const peopleLanes: Lane[] = [
  { label: "Admissões", tone: "green", icon: "user" },
  { label: "Rescisões", tone: "red", icon: "userOff" },
  { label: "Férias", tone: "yellow", icon: "sun" },
  { label: "Folha", tone: "purple", icon: "file" }
];

const layoutStorageKey = "purplesoft_factory_dashboard_layout_v1";
const socketStorageKey = "purplesoft_factory_dashboard_sockets_v1";

const defaultLayout: LayoutState = {
  entry: { x: 58, y: 72 },
  register: { x: 224, y: 82 },
  financial: { x: 404, y: 78 },
  triage: { x: 584, y: 76 },
  accounting: { x: 724, y: 54 },
  people: { x: 672, y: 416 },
  consolidation: { x: 1214, y: 334 },
  delivery: { x: 1342, y: 354 },
  focus: { x: 58, y: 596 }
};

const nodeSize: Record<LayoutId, { width: number; beltY: number; height: number }> = {
  entry: { width: 150, beltY: 204, height: 220 },
  register: { width: 150, beltY: 194, height: 220 },
  financial: { width: 150, beltY: 198, height: 220 },
  triage: { width: 150, beltY: 202, height: 230 },
  accounting: { width: 332, beltY: 172, height: 325 },
  people: { width: 332, beltY: 160, height: 325 },
  consolidation: { width: 132, beltY: 140, height: 220 },
  delivery: { width: 88, beltY: 120, height: 210 },
  focus: { width: 300, beltY: 80, height: 120 }
};

const defaultSockets = Object.fromEntries(
  (Object.keys(nodeSize) as LayoutId[]).map((id) => [
    id,
    {
      in: { x: 0, y: nodeSize[id].beltY },
      out: { x: nodeSize[id].width, y: nodeSize[id].beltY }
    }
  ])
) as SocketState;

function loadLayout(): LayoutState {
  const stored = localStorage.getItem(layoutStorageKey);
  if (!stored) return defaultLayout;
  try {
    return { ...defaultLayout, ...(JSON.parse(stored) as Partial<LayoutState>) };
  } catch {
    return defaultLayout;
  }
}

function saveLayout(layout: LayoutState) {
  localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
}

function loadSockets(): SocketState {
  const stored = localStorage.getItem(socketStorageKey);
  if (!stored) return defaultSockets;
  try {
    const parsed = JSON.parse(stored) as Partial<SocketState>;
    return { ...defaultSockets, ...parsed };
  } catch {
    return defaultSockets;
  }
}

function saveSockets(sockets: SocketState) {
  localStorage.setItem(socketStorageKey, JSON.stringify(sockets));
}

function absoluteSocket(layout: LayoutState, sockets: SocketState, id: LayoutId, side: SocketSide): Position {
  const node = layout[id];
  const socket = sockets[id][side];
  return { x: node.x + socket.x, y: node.y + socket.y };
}

function connectorPath(layout: LayoutState, sockets: SocketState, from: LayoutId, to: LayoutId) {
  const start = absoluteSocket(layout, sockets, from, "out");
  const end = absoluteSocket(layout, sockets, to, "in");
  const distance = Math.max(80, Math.abs(end.x - start.x) * 0.5);
  const c1 = { x: start.x + distance, y: start.y };
  const c2 = { x: end.x - distance, y: end.y };
  return `M${start.x} ${start.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

const connections: Connection[] = [
  { id: "entry-register", from: "entry", to: "register" },
  { id: "register-financial", from: "register", to: "financial" },
  { id: "financial-triage", from: "financial", to: "triage" },
  { id: "triage-accounting", from: "triage", to: "accounting", tone: "blue" },
  { id: "triage-people", from: "triage", to: "people", tone: "green" },
  { id: "accounting-consolidation", from: "accounting", to: "consolidation", tone: "blue" },
  { id: "people-consolidation", from: "people", to: "consolidation", tone: "green" },
  { id: "consolidation-delivery", from: "consolidation", to: "delivery" }
];

function DocumentCard({ final = false }: { final?: boolean }) {
  return (
    <div className={`fd-document ${final ? "fd-document-final" : ""}`}>
      <strong>{final ? "DEMANDA CONCLUÍDA" : "DEMANDA"}</strong>
      <span />
      <span />
      <span />
      {final && <Check className="fd-doc-check" size={40} />}
    </div>
  );
}

function MachineBlock({ label, kind }: { step: number; label: string; kind: MachineKind }) {
  return (
    <section className={`fd-machine fd-machine-${kind}`}>
      <div className="fd-label">{label}</div>
      <div className="fd-machine-body">
        <span className="fd-signal" />
        {kind === "document" && (
          <div className="fd-document-holder">
            <DocumentCard />
          </div>
        )}
        {kind === "terminal" && (
          <div className="fd-terminal-screen">
            <User size={34} />
            <i />
            <i />
            <i />
          </div>
        )}
        {kind === "finance" && (
          <div className="fd-finance-panel">
            <Check size={40} />
            <strong>Liberado</strong>
          </div>
        )}
        {kind === "triage" && (
          <div className="fd-triage-slot">
            <DocumentCard />
            <Workflow size={30} />
          </div>
        )}
        <div className="fd-machine-drawer" />
      </div>
    </section>
  );
}

function LaneIcon({ icon }: { icon: Lane["icon"] }) {
  const props = { size: 24, strokeWidth: 2.4 };
  if (icon === "bank") return <Banknote {...props} />;
  if (icon === "chart") return <LineChart {...props} />;
  if (icon === "down") return <TrendingDown {...props} />;
  if (icon === "gear") return <Settings {...props} />;
  if (icon === "user") return <UserCheck {...props} />;
  if (icon === "userOff") return <Users {...props} />;
  if (icon === "sun") return <Target {...props} />;
  return <FileText {...props} />;
}

function WorkLane({ lane }: { lane: Lane }) {
  return (
    <div className="fd-work-lane">
      <div className={`fd-lane-icon fd-tone-${lane.tone}`}>
        <LaneIcon icon={lane.icon} />
      </div>
      <div className="fd-lane-card">{lane.label}</div>
      <div className="fd-lane-belt">
        <span className="fd-lane-rollers" />
        <span className="fd-lane-light" />
        <span className="fd-lane-piece" />
      </div>
      <div className="fd-lane-doc"><DocumentCard /></div>
    </div>
  );
}

function DepartmentPanel({ title, lanes, className }: { step: number; title: string; lanes: Lane[]; className: string }) {
  return (
    <section className={`fd-department ${className}`}>
      <div className="fd-department-title">{title}</div>
      <div className="fd-department-shell">
        {lanes.map((lane) => <WorkLane lane={lane} key={lane.label} />)}
      </div>
    </section>
  );
}

function ConsolidationMachine() {
  return (
    <section className="fd-consolidation">
      <div className="fd-label">Consolidação</div>
      <div className="fd-consolidation-body">
        <span className="fd-signal" />
        <div className="fd-chart-panel">
          <BarChart3 size={58} />
        </div>
      </div>
    </section>
  );
}

function DeliveryBox() {
  return (
    <section className="fd-delivery">
      <div className="fd-label">Entrega Final</div>
      <div className="fd-pallet">
        <DocumentCard final />
        <div className="fd-box">
          <span />
          <strong>↑</strong>
        </div>
      </div>
    </section>
  );
}

function FocusPanel() {
  return (
    <section className="fd-focus-panel">
      <strong>FOCO • FLUXO • RESULTADO</strong>
      <div>
        <span><Target size={30} />Eficiência</span>
        <span><Users size={30} />Colaboração</span>
        <span><Settings size={30} />Qualidade</span>
      </div>
    </section>
  );
}

function ConveyorSvg({ layout, sockets }: { layout: LayoutState; sockets: SocketState }) {
  return (
    <svg className="fd-connections" viewBox="0 0 1440 760" aria-hidden="true">
      <defs>
        <linearGradient id="fd-belt" x1="0" x2="1">
          <stop offset="0%" stopColor="#41536f" />
          <stop offset="52%" stopColor="#27364c" />
          <stop offset="100%" stopColor="#18263a" />
        </linearGradient>
        <linearGradient id="fd-piece" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cfe4f8" />
        </linearGradient>
      </defs>

      {connections.map((connection, index) => {
        const path = connectorPath(layout, sockets, connection.from, connection.to);
        const start = absoluteSocket(layout, sockets, connection.from, "out");
        const end = absoluteSocket(layout, sockets, connection.to, "in");
        return (
          <g className="fd-connector" key={connection.id}>
            <path className="fd-belt-shadow" d={path} />
            <path className="fd-belt-main" d={path} />
            <path className="fd-belt-rollers" d={path} />
            <circle className="fd-svg-port" cx={start.x} cy={start.y} r="8" />
            <circle className="fd-svg-port fd-svg-port-end" cx={end.x} cy={end.y} r="8" />
            <g className={`fd-moving-piece ${connection.tone === "green" ? "fd-moving-piece-green" : ""} ${connection.to === "delivery" ? "fd-moving-piece-final" : ""}`}>
              <rect x="-12" y="-9" width="24" height="18" rx="4" />
              <line x1="-6" y1="-2" x2="6" y2="-2" />
              <line x1="-6" y1="4" x2="3" y2="4" />
              <animateMotion dur={`${3.1 + (index % 3) * 0.45}s`} begin={`-${index * 0.34}s`} repeatCount="indefinite" path={path} rotate="auto" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function DraggableNode({ id, layout, onMove, designMode, className = "", children }: {
  id: LayoutId;
  layout: LayoutState;
  onMove: (id: LayoutId, position: Position) => void;
  designMode: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const position = layout[id];

  function scaleFromStage(target: EventTarget & HTMLDivElement) {
    const stage = target.closest(".fd-stage");
    if (!stage) return 1;
    const rect = stage.getBoundingClientRect();
    return rect.width / 1440 || 1;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!designMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    const scale = scaleFromStage(event.currentTarget);
    const next = {
      x: Math.round(dragRef.current.originX + (event.clientX - dragRef.current.startX) / scale),
      y: Math.round(dragRef.current.originY + (event.clientY - dragRef.current.startY) / scale)
    };
    onMove(id, next);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={`fd-node ${designMode ? "fd-node-design" : ""} ${className}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}

function SocketHandle({ side, position, onMove }: {
  side: SocketSide;
  position: Position;
  onMove: (position: Position) => void;
}) {
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  function scaleFromStage(target: EventTarget & HTMLSpanElement) {
    const stage = target.closest(".fd-stage");
    if (!stage) return 1;
    const rect = stage.getBoundingClientRect();
    return rect.width / 1440 || 1;
  }

  function onPointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    if (!dragRef.current.active) return;
    event.stopPropagation();
    const scale = scaleFromStage(event.currentTarget);
    onMove({
      x: Math.round(dragRef.current.originX + (event.clientX - dragRef.current.startX) / scale),
      y: Math.round(dragRef.current.originY + (event.clientY - dragRef.current.startY) / scale)
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    if (!dragRef.current.active) return;
    event.stopPropagation();
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <span
      className={`fd-socket-handle fd-socket-${side}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title={side === "in" ? "Ponto de entrada da esteira" : "Ponto de saída da esteira"}
    />
  );
}

export default function FactoryDashboard() {
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());
  const [sockets, setSockets] = useState<SocketState>(() => loadSockets());
  const [designMode, setDesignMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  function moveNode(id: LayoutId, position: Position) {
    setLayout((current) => {
      setSavedMessage("");
      return { ...current, [id]: position };
    });
  }

  function resetLayout() {
    localStorage.removeItem(layoutStorageKey);
    localStorage.removeItem(socketStorageKey);
    setLayout(defaultLayout);
    setSockets(defaultSockets);
    setSavedMessage("Layout resetado");
  }

  function moveSocket(id: LayoutId, side: SocketSide, position: Position) {
    setSockets((current) => {
      setSavedMessage("");
      return {
        ...current,
        [id]: {
          ...current[id],
          [side]: position
        }
      };
    });
  }

  function saveCurrentLayout() {
    saveLayout(layout);
    saveSockets(sockets);
    setSavedMessage("Layout salvo");
  }

  function withSockets(id: LayoutId, children: React.ReactNode) {
    const nodeSockets = sockets[id];
    return (
      <>
        {id !== "focus" && (
          <>
            {designMode && (
              <>
                <SocketHandle side="in" position={nodeSockets.in} onMove={(position) => moveSocket(id, "in", position)} />
                <SocketHandle side="out" position={nodeSockets.out} onMove={(position) => moveSocket(id, "out", position)} />
              </>
            )}
          </>
        )}
        {children}
      </>
    );
  }

  return (
    <main className="fd-page">
      <section className="fd-scale-shell">
        <div className="fd-stage">
          <div className="fd-floor" />
          <ConveyorSvg layout={layout} sockets={sockets} />
          <div className="fd-design-toolbar">
            <button className={designMode ? "active" : ""} type="button" onClick={() => setDesignMode((value) => !value)}>
              {designMode ? "Sair do design" : "Modo design"}
            </button>
            <button type="button" onClick={saveCurrentLayout}>Salvar posição</button>
            <button type="button" onClick={resetLayout}>Resetar layout</button>
            {savedMessage && <span>{savedMessage}</span>}
          </div>

          <DraggableNode id="entry" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("entry", <MachineBlock step={1} label="Entrada da Demanda" kind="document" />)}</DraggableNode>
          <DraggableNode id="register" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("register", <MachineBlock step={2} label="Cadastro" kind="terminal" />)}</DraggableNode>
          <DraggableNode id="financial" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("financial", <MachineBlock step={3} label="Financeiro" kind="finance" />)}</DraggableNode>
          <DraggableNode id="triage" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("triage", <MachineBlock step={4} label="Triagem" kind="triage" />)}</DraggableNode>

          <DraggableNode id="accounting" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("accounting", <DepartmentPanel step={5} title="Departamento Contábil" lanes={accountingLanes} className="fd-accounting" />)}</DraggableNode>
          <DraggableNode id="people" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("people", <DepartmentPanel step={6} title="Departamento Pessoal" lanes={peopleLanes} className="fd-people" />)}</DraggableNode>

          <DraggableNode id="consolidation" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("consolidation", <ConsolidationMachine />)}</DraggableNode>
          <DraggableNode id="delivery" layout={layout} onMove={moveNode} designMode={designMode}>{withSockets("delivery", <DeliveryBox />)}</DraggableNode>
          <DraggableNode id="focus" layout={layout} onMove={moveNode} designMode={designMode}><FocusPanel /></DraggableNode>
        </div>
      </section>
    </main>
  );
}
