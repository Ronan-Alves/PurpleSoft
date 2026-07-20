import React, { useEffect, useRef, useState } from "react";
import {
  Banknote,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  LineChart,
  PackageCheck,
  Settings,
  ShieldCheck,
  Target,
  TrendingDown,
  User,
  UserCheck,
  Users,
  Workflow
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { API_URL, authHeaders, useFilteredOperationMap } from "../app/shared";
import "./FactoryDashboard.css";

type MachineKind = "document" | "terminal" | "finance" | "triage";
type LayoutId = "entry" | "register" | "financial" | "triage" | "accounting" | "people" | "consolidation" | "delivery" | "focus";
type Position = { x: number; y: number };
type LayoutState = Record<LayoutId, Position>;
type SocketSide = "in" | "out";
type SocketState = Record<LayoutId, Record<SocketSide, Position>>;
type Connection = { id: string; from: LayoutId; to: LayoutId; tone?: "blue" | "green" };
type AreaRouteId = "entrada" | "cadastro" | "financeiro" | "triagem" | "contabil" | "pessoal" | "consolidacao" | "entrega";

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

const stageSize = { width: 1440, height: 760 };
const defaultViewportSize: Position = { x: stageSize.width, y: stageSize.height };
const factoryWorld = { width: 2200, height: 1200 };

const areaRoutes: Partial<Record<LayoutId, AreaRouteId>> = {
  entry: "entrada",
  register: "cadastro",
  financial: "financeiro",
  triage: "triagem",
  accounting: "contabil",
  people: "pessoal",
  consolidation: "consolidacao",
  delivery: "entrega"
};

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

function finiteOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampPan(position: Position, viewport: Position = defaultViewportSize, zoom = 1): Position {
  return {
    x: clamp(position.x, viewport.x / zoom - factoryWorld.width, 0),
    y: clamp(position.y, viewport.y / zoom - factoryWorld.height, 0)
  };
}

function clampNodePosition(id: LayoutId, position: Position): Position {
  const size = nodeSize[id];
  return {
    x: clamp(position.x, 0, factoryWorld.width - size.width),
    y: clamp(position.y, 0, factoryWorld.height - size.height)
  };
}

function loadLayout(): LayoutState {
  const stored = localStorage.getItem(layoutStorageKey);
  if (!stored) return defaultLayout;
  try {
    const parsed = JSON.parse(stored) as Partial<LayoutState>;
    return (Object.keys(defaultLayout) as LayoutId[]).reduce((layout, id) => {
      const position = parsed[id];
      const x = position?.x;
      const y = position?.y;
      layout[id] = {
        x: finiteOr(x, defaultLayout[id].x),
        y: finiteOr(y, defaultLayout[id].y)
      };
      layout[id] = clampNodePosition(id, layout[id]);
      return layout;
    }, {} as LayoutState);
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
    return (Object.keys(defaultSockets) as LayoutId[]).reduce((sockets, id) => {
      const savedNode = parsed[id];
      const inX = savedNode?.in?.x;
      const inY = savedNode?.in?.y;
      const outX = savedNode?.out?.x;
      const outY = savedNode?.out?.y;
      sockets[id] = {
        in: {
          x: finiteOr(inX, defaultSockets[id].in.x),
          y: finiteOr(inY, defaultSockets[id].in.y)
        },
        out: {
          x: finiteOr(outX, defaultSockets[id].out.x),
          y: finiteOr(outY, defaultSockets[id].out.y)
        }
      };
      return sockets;
    }, {} as SocketState);
  } catch {
    return defaultSockets;
  }
}

function saveSockets(sockets: SocketState) {
  localStorage.setItem(socketStorageKey, JSON.stringify(sockets));
}

function scaleFromStage(target: Element) {
  return target.closest(".fd-stage") ? 1 : 1;
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
    <svg className="fd-connections" viewBox={`0 0 ${factoryWorld.width} ${factoryWorld.height}`} aria-hidden="true">
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
      data-area-id={areaRoutes[id]}
      role={!designMode && areaRoutes[id] ? "button" : undefined}
      tabIndex={!designMode && areaRoutes[id] ? 0 : undefined}
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
  const navigate = useNavigate();
  const map = useFilteredOperationMap();
  const [layout, setLayout] = useState<LayoutState>(defaultLayout);
  const [sockets, setSockets] = useState<SocketState>(defaultSockets);
  const [canManageLayout, setCanManageLayout] = useState(false);
  const [designMode, setDesignMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [viewportPan, setViewportPan] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState<Position>(defaultViewportSize);
  const [isPanning, setIsPanning] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    areaId: ""
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateSize = () => {
      const rect = stage.getBoundingClientRect();
      const nextSize = { x: Math.round(rect.width), y: Math.round(rect.height) };
      setViewportSize(nextSize);
      setViewportPan((current) => clampPan(current, nextSize, zoom));
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [zoom]);

  useEffect(() => {
    fetch(`${API_URL}/factory-layout`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (!body) return;
      setCanManageLayout(Boolean(body.canManage));
      if (Object.keys(body.layout ?? {}).length) setLayout(body.layout as LayoutState);
      if (Object.keys(body.sockets ?? {}).length) setSockets(body.sockets as SocketState);
    }).catch(() => undefined);
  }, []);

  function moveNode(id: LayoutId, position: Position) {
    setLayout((current) => {
      setSavedMessage("");
      return { ...current, [id]: clampNodePosition(id, position) };
    });
  }

  function resetLayout() {
    if (!canManageLayout) return;
    setLayout(defaultLayout);
    setSockets(defaultSockets);
    setViewportPan(clampPan({ x: 0, y: 0 }, viewportSize, zoom));
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

  async function saveCurrentLayout() {
    if (!canManageLayout) return;
    const response = await fetch(`${API_URL}/factory-layout`, { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ layout, sockets }) });
    setSavedMessage(response.ok ? "Layout salvo no banco" : "Não foi possível salvar o layout");
  }

  function onWorldPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (designMode || event.button !== 0) return;
    const clickedNode = (event.target as HTMLElement).closest<HTMLElement>(".fd-node[data-area-id]");
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewportPan.x,
      originY: viewportPan.y,
      areaId: clickedNode?.dataset.areaId ?? ""
    };
    setIsPanning(true);
  }

  function onWorldPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current.active) return;
    const scale = scaleFromStage(event.currentTarget);
    const deltaX = event.clientX - panRef.current.startX;
    const deltaY = event.clientY - panRef.current.startY;
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      panRef.current.moved = true;
    }
    setViewportPan(clampPan({
      x: Math.round(panRef.current.originX + deltaX / (scale * zoom)),
      y: Math.round(panRef.current.originY + deltaY / (scale * zoom))
    }, viewportSize, zoom));
  }

  function onWorldPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current.active) return;
    const { areaId, moved } = panRef.current;
    panRef.current.active = false;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (areaId && !moved) {
      navigate(`/area/${areaId}`);
    }
  }

  function onWorldPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current.active) return;
    panRef.current.active = false;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onWorldKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (designMode || (event.key !== "Enter" && event.key !== " ")) return;
    const areaId = (event.target as HTMLElement).dataset.areaId;
    if (!areaId) return;
    event.preventDefault();
    navigate(`/area/${areaId}`);
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
    <Shell>
      <main className={`fd-page ${rightCollapsed ? "fd-right-collapsed" : ""}`}>
        <section className="fd-factory-area">
          <div className="fd-scale-shell">
        <div ref={stageRef} className={`fd-stage ${designMode ? "fd-stage-design" : ""} ${isPanning ? "fd-stage-panning" : ""}`}>
          <div className="fd-design-toolbar">
            {canManageLayout && <><button className={designMode ? "active" : ""} type="button" onClick={() => setDesignMode((value) => !value)}>
              {designMode ? "Sair do design" : "Modo design"}
            </button>
            <button type="button" onClick={saveCurrentLayout}>Salvar posição</button>
            <button type="button" onClick={resetLayout}>Resetar layout</button>
            </>}
            <button type="button" onClick={() => setViewportPan(clampPan({ x: 0, y: 0 }, viewportSize, zoom))}>Centralizar visão</button>
            <span className="fd-zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))}>−</button><strong>{Math.round(zoom * 100)}%</strong><button type="button" onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(1))))}>+</button></span>
            {savedMessage && <span>{savedMessage}</span>}
          </div>

          <div
            className={`fd-world ${isPanning ? "fd-world-panning" : ""}`}
            style={{
              width: factoryWorld.width,
              height: factoryWorld.height,
              transform: `translate3d(${viewportPan.x}px, ${viewportPan.y}px, 0) scale(${zoom})`
            }}
            onPointerDown={onWorldPointerDown}
            onPointerMove={onWorldPointerMove}
            onPointerUp={onWorldPointerUp}
            onPointerCancel={onWorldPointerCancel}
            onKeyDown={onWorldKeyDown}
          >
            <div className="fd-floor" />
            <ConveyorSvg layout={layout} sockets={sockets} />

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
        </div>
          </div>
        </section>
        <aside className="right-panel fd-side-panel">
          <button className="panel-toggle" onClick={() => setRightCollapsed((value) => !value)} title={rightCollapsed ? "Expandir resumo" : "Recolher resumo"}>
            {rightCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </button>
          <div className="right-panel-content">
            <section className="panel">
              <h2>Resumo da Operação</h2>
              <div className="summary-grid">
                <div className="summary-card"><PackageCheck /><span>Concluídas</span><strong>{map.summary.done}</strong></div>
                <div className="summary-card"><Bell /><span>Pendências</span><strong>{map.summary.pending}</strong></div>
                <div className="summary-card"><ShieldCheck /><span>Bloqueadas</span><strong>{map.summary.blocked}</strong></div>
                <div className="summary-card"><BarChart3 /><span>Qualidade</span><strong>{map.summary.quality}%</strong></div>
              </div>
            </section>
            <section className="panel">
              <h2>Legenda</h2>
              <p className="legend l0"><span />Disponível</p>
              <p className="legend l1"><span />Em andamento</p>
              <p className="legend l2"><span />Pendente</p>
              <p className="legend l3"><span />Concluído</p>
            </section>
            <section className="panel demand-card">
              <h2>Layout da Fábrica</h2>
              <strong>{designMode ? "Modo design ativo" : "Modo operação"}</strong>
              <p>{designMode ? "Arraste estações e pontos de conexão." : "Arraste o chão para navegar e clique nas estações."}</p>
              <div className="progress"><span style={{ width: `${map.summary.productivity}%` }} /></div>
            </section>
          </div>
        </aside>
      </main>
    </Shell>
  );
}
