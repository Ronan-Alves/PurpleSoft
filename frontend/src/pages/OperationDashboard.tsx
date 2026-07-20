import React, { useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Bell, Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, GitBranch, ListChecks, PackageCheck, PlayCircle, ShieldCheck, UserRound, UsersRound, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { departmentCatalog, departmentZones, processPoints, useFilteredOperationMap } from "../app/shared";
import type { Task, WorkArea } from "../app/shared";

export default function Dashboard() {
  const map = useFilteredOperationMap();
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
