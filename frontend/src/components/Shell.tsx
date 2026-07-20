import { useState, type ReactNode } from "react";
import { Activity, BarChart3, Boxes, ChevronRight, CircleHelp, ClipboardList, Home, LogOut, Menu, Settings, Trophy, UserRound, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { operatorTokenKey, useUserFilter } from "../app/shared";

export default function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { employees, assignee, setAssignee } = useUserFilter();
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
            <label className="global-user-filter">Responsável<select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="todos">Todos os usuários</option>{employees.map((employee) => <option value={employee.name} key={employee.id}>{employee.name}</option>)}</select></label>
            <div className="score"><Trophy size={28} /><span>Nivel da Operacao<strong>Ouro</strong></span></div>
            <div className="score"><Zap size={28} /><span>Pontuacao<strong>2.560 pts</strong></span></div>
            <button className="user-button"><UserRound /> {localStorage.getItem("purplesoft_user") ?? "Gerente"}</button>
            <button className="icon-button" onClick={() => { localStorage.removeItem(operatorTokenKey); localStorage.removeItem("purplesoft_user"); navigate("/login"); }} title="Sair"><LogOut /></button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
