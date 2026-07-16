import { useEffect, useState } from "react";
import { ArrowLeft, Building2, FileText, Lock, LogOut } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { API_URL, clientAuthHeaders, clientSessionKey, useOperationState } from "../app/shared";
import type { AccountingClientCompaniesResponse, AccountingClientCompany, ClientLoginResponse, ClientPending, ClientPendingsResponse } from "../app/shared";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

const emptyAccountingForm = {
  companyName: "",
  cnpj: "",
  taxRegime: "",
  spedEcdDelivery: "",
  financialSystemReports: "",
  onlyBankStatements: "",
  banksUsed: "",
  averageBankPages: "",
  hasApplicationStatementsPdf: "",
  accountingDelayed: "",
  wantsAccountingRegularization: "",
  closingFrequency: "",
  systemUsed: "",
  wantsSpedEcdEcf: "",
  spedPeriod: ""
};

type AccountingForm = typeof emptyAccountingForm;
type BulkAccountingField = Exclude<keyof AccountingForm, "companyName" | "cnpj">;

const bulkAccountingFields: Array<{
  key: BulkAccountingField;
  label: string;
  kind: "input" | "select";
  placeholder?: string;
  options?: string[];
}> = [
  { key: "taxRegime", label: "Regime tributario", kind: "select", options: ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Nao sei informar"] },
  { key: "spedEcdDelivery", label: "Entrega do SPED ECD", kind: "select", options: ["Sim", "Nao", "Nao sei informar"] },
  { key: "financialSystemReports", label: "Sistema financeiro gera relatorios?", kind: "select", options: ["Sim", "Nao", "Em implantacao"] },
  { key: "onlyBankStatements", label: "Utiliza apenas extratos bancarios?", kind: "select", options: ["Sim", "Nao", "Parcialmente"] },
  { key: "banksUsed", label: "Bancos utilizados", kind: "input", placeholder: "Ex.: Itau, Bradesco, Santander" },
  { key: "averageBankPages", label: "Media de paginas por banco/mes", kind: "input", placeholder: "Ex.: 20 paginas por banco" },
  { key: "hasApplicationStatementsPdf", label: "Extratos de aplicacao/CC/EM PDF?", kind: "select", options: ["Sim", "Nao", "Nao sei informar"] },
  { key: "accountingDelayed", label: "Contabilidade em atraso?", kind: "select", options: ["Sim", "Nao", "Nao sei informar"] },
  { key: "wantsAccountingRegularization", label: "Deseja regularizar?", kind: "select", options: ["Sim", "Nao", "A avaliar"] },
  { key: "closingFrequency", label: "Forma de fechamento contabil", kind: "select", options: ["Mensalmente", "Por demanda", "Outro"] },
  { key: "systemUsed", label: "Sistema utilizado", kind: "input", placeholder: "Ex.: Omie, Conta Azul, Bling" },
  { key: "wantsSpedEcdEcf", label: "Entregar SPED ECD/ECF?", kind: "select", options: ["Sim", "Nao", "Apenas ECD", "Apenas ECF", "A avaliar"] },
  { key: "spedPeriod", label: "Periodo", kind: "input", placeholder: "Ex.: 2024, 2025, desde jan/2026" }
];

function getClientSession() {
  const stored = localStorage.getItem(clientSessionKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as { customerId: string; customerName?: string; accessToken?: string };
  } catch {
    return null;
  }
}

export function ClientLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_URL}/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Login ou senha invalidos.");
      const body = await response.json() as ClientLoginResponse;
      localStorage.setItem(clientSessionKey, JSON.stringify({ customerId: body.customerId, customerName: body.customerName, accessToken: body.access_token }));
      navigate("/cliente/pendencias");
    } catch {
      setError("Login ou senha invalidos.");
    }
  }

  return (
    <main className="client-login-page">
      <section className="client-login-panel">
        <div className="brand-mark"><Building2 size={30} /></div>
        <p className="eyebrow">Portal do Cliente</p>
        <h1>Acesse suas pendencias</h1>
        <p>Entre com o login e senha encaminhados pelo escritorio para preencher informacoes solicitadas.</p>
        <form onSubmit={submit}>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <span className="form-error">{error}</span>}
          <button type="submit"><Lock size={18} /> Entrar</button>
        </form>
      </section>
    </main>
  );
}

export function ClientPrivateRoute({ children }: { children: React.ReactNode }) {
  return getClientSession()?.accessToken ? children : <Navigate to="/cliente/login" replace />;
}

function ClientShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const store = useOperationState();
  const session = getClientSession();
  const customer = store.state.customers.find((item) => item.id === session?.customerId);

  function logout() {
    localStorage.removeItem(clientSessionKey);
    navigate("/cliente/login");
  }

  return (
    <main className="client-portal">
      <header className="client-topbar">
        <div>
          <p className="eyebrow">Portal do Cliente</p>
          <h1>{customer?.tradeName || customer?.legalName || session?.customerName || "Cliente"}</h1>
        </div>
        <button type="button" onClick={logout}><LogOut size={18} /> Sair</button>
      </header>
      {children}
    </main>
  );
}

export function ClientPendingListPage() {
  const store = useOperationState();
  const session = getClientSession();
  const customerId = session?.customerId ?? "";
  const [apiPendings, setApiPendings] = useState<ClientPending[] | null>(null);
  const pendings = apiPendings ?? store.state.clientPendings.filter((pending) => pending.customerId === customerId);

  useEffect(() => {
    if (!customerId) return;
    fetch(`${API_URL}/client/pendings`, { headers: clientAuthHeaders() })
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar pendencias");
        return response.json() as Promise<ClientPendingsResponse>;
      })
      .then((body) => setApiPendings(body.pendings))
      .catch(() => setApiPendings(null));
  }, [customerId]);

  return (
    <ClientShell>
      <section className="client-panel">
        <h2>Pendencias</h2>
        <div className="client-pending-list">
          {pendings.map((pending) => (
            <Link to={`/cliente/pendencias/${pending.id}`} key={pending.id}>
              <strong>{pending.title}</strong>
              <span>{pending.description}</span>
              <small>{pending.status} · criada em {pending.createdAt}</small>
            </Link>
          ))}
          {pendings.length === 0 && <p className="empty-state">Nenhuma pendencia aberta no momento.</p>}
        </div>
      </section>
    </ClientShell>
  );
}

export function ClientPendingFormPage() {
  const { pendingId } = useParams();
  const store = useOperationState();
  const navigate = useNavigate();
  const session = getClientSession();
  const [apiPendings, setApiPendings] = useState<ClientPending[] | null>(null);
  const [companies, setCompanies] = useState<AccountingClientCompany[]>([]);
  const [sentMessage, setSentMessage] = useState("");
  const [form, setForm] = useState(emptyAccountingForm);
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState(emptyAccountingForm);
  const [bulkFields, setBulkFields] = useState<BulkAccountingField[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const pending = (apiPendings ?? store.state.clientPendings).find((item) => item.id === pendingId && item.customerId === session?.customerId);

  useEffect(() => {
    if (!session?.customerId) return;
    fetch(`${API_URL}/client/pendings`, { headers: clientAuthHeaders() })
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar pendencia");
        return response.json() as Promise<ClientPendingsResponse>;
      })
      .then((body) => setApiPendings(body.pendings))
      .catch(() => setApiPendings(null));
  }, [session?.customerId]);

  function loadCompanies() {
    if (!session?.customerId || !pendingId) return;
    fetch(`${API_URL}/client/accounting-companies?pending_id=${encodeURIComponent(pendingId)}`, { headers: clientAuthHeaders() })
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar empresas");
        return response.json() as Promise<AccountingClientCompaniesResponse>;
      })
      .then((body) => setCompanies(body.companies))
      .catch(() => setCompanies([]));
  }

  useEffect(() => {
    loadCompanies();
  }, [session?.customerId, pendingId]);

  function startEditingCompany(company: AccountingClientCompany) {
    setEditingCompanyId(company.id);
    setSentMessage("");
    setForm({
      companyName: company.companyName,
      cnpj: formatCpfCnpj(company.cnpj),
      taxRegime: company.taxRegime,
      spedEcdDelivery: company.spedEcdDelivery,
      financialSystemReports: company.financialSystemReports,
      onlyBankStatements: company.onlyBankStatements,
      banksUsed: company.banksUsed,
      averageBankPages: company.averageBankPages,
      hasApplicationStatementsPdf: company.hasApplicationStatementsPdf,
      accountingDelayed: company.accountingDelayed,
      wantsAccountingRegularization: company.wantsAccountingRegularization,
      closingFrequency: company.closingFrequency,
      systemUsed: company.systemUsed,
      wantsSpedEcdEcf: company.wantsSpedEcdEcf,
      spedPeriod: company.spedPeriod
    });
  }

  function cancelEditingCompany() {
    setEditingCompanyId("");
    setSentMessage("");
    setForm(emptyAccountingForm);
  }

  function toggleCompanySelection(companyId: string) {
    setBulkMessage("");
    setSelectedCompanyIds((current) => current.includes(companyId)
      ? current.filter((id) => id !== companyId)
      : [...current, companyId]
    );
  }

  function toggleAllCompanies() {
    setBulkMessage("");
    setSelectedCompanyIds((current) => current.length === companies.length ? [] : companies.map((company) => company.id));
  }

  function toggleBulkField(field: BulkAccountingField) {
    setBulkMessage("");
    setBulkFields((current) => current.includes(field)
      ? current.filter((item) => item !== field)
      : [...current, field]
    );
  }

  async function applyBulkUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.customerId || !pendingId) return;
    if (selectedCompanyIds.length === 0) {
      setBulkMessage("Selecione ao menos uma empresa.");
      return;
    }
    if (bulkFields.length === 0) {
      setBulkMessage("Marque ao menos um campo para aplicar em lote.");
      return;
    }
    const updates = bulkFields.reduce<Partial<AccountingForm>>((payload, field) => {
      payload[field] = bulkForm[field];
      return payload;
    }, {});
    const response = await fetch(`${API_URL}/client/accounting-companies/bulk`, {
      method: "PATCH",
      headers: clientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        customerId: session.customerId,
        pendingId,
        companyIds: selectedCompanyIds,
        ...updates
      })
    });
    if (!response.ok) {
      setBulkMessage("Nao foi possivel aplicar em lote. Confira os campos e tente novamente.");
      return;
    }
    const body = await response.json() as AccountingClientCompaniesResponse;
    setCompanies((current) => current.map((company) => body.companies.find((updated) => updated.id === company.id) ?? company));
    setBulkMessage(`${body.companies.length} empresa(s) atualizada(s).`);
  }

  async function submitCompany(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.customerId || !pendingId) return;
    setSentMessage("");
    const response = await fetch(editingCompanyId ? `${API_URL}/client/accounting-companies/${editingCompanyId}` : `${API_URL}/client/accounting-companies`, {
      method: editingCompanyId ? "PUT" : "POST",
      headers: clientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        customerId: session.customerId,
        pendingId,
        ...form
      })
    });
    if (!response.ok) {
      setSentMessage("Nao foi possivel salvar este cadastro. Confira os dados e tente novamente.");
      return;
    }
    const company = await response.json() as AccountingClientCompany;
    setCompanies((current) => editingCompanyId
      ? current.map((item) => item.id === company.id ? company : item)
      : [company, ...current]
    );
    setForm(emptyAccountingForm);
    setEditingCompanyId("");
    setSentMessage(editingCompanyId ? "Cadastro atualizado." : "Empresa cadastrada. Voce pode incluir outra empresa se necessario.");
  }

  if (!pending) {
    return (
      <ClientShell>
        <section className="client-panel">
          <h2>Pendencia nao localizada</h2>
          <button type="button" onClick={() => navigate("/cliente/pendencias")}><ArrowLeft size={18} /> Voltar</button>
        </section>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <section className="client-panel client-accounting-form">
        <Link className="back-button" to="/cliente/pendencias"><ArrowLeft size={18} /> Voltar</Link>
        <h2>{pending.title}</h2>
        <p>Inclua uma empresa por CNPJ. Depois desta etapa, a equipe podera visualizar o que sera feito para cada empresa cadastrada.</p>
        <section className="client-company-list">
          <div className="client-company-list-header">
            <div>
              <h3>Empresas cadastradas</h3>
              <span>{selectedCompanyIds.length} de {companies.length} selecionada(s)</span>
            </div>
            {companies.length > 0 && (
              <div className="client-company-list-actions">
                <button className="secondary-button" type="button" onClick={toggleAllCompanies}>
                  {selectedCompanyIds.length === companies.length ? "Limpar selecao" : "Selecionar todas"}
                </button>
                <button className="secondary-button" type="button" onClick={() => {
                  setBulkMessage("");
                  setBulkModalOpen(true);
                }}>
                  Editar Empresas Selecionadas
                </button>
              </div>
            )}
          </div>
          {companies.map((company) => (
            <article
              className={`client-company-card ${editingCompanyId === company.id ? "active" : ""} ${selectedCompanyIds.includes(company.id) ? "selected" : ""}`}
              key={company.id}
              onClick={() => startEditingCompany(company)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  startEditingCompany(company);
                }
              }}
            >
              <label className="client-company-check" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedCompanyIds.includes(company.id)}
                  onChange={() => toggleCompanySelection(company.id)}
                />
                Selecionar
              </label>
              <div>
                <strong>{company.companyName}</strong>
                <span>{company.cnpj} · {company.taxRegime || "regime nao informado"}</span>
                <small>Clique para editar</small>
              </div>
              <ul>
                {company.scopeSummary.map((scope) => <li key={scope}>{scope}</li>)}
              </ul>
            </article>
          ))}
          {companies.length === 0 && <p className="empty-state">Nenhuma empresa cadastrada nesta pendencia ainda.</p>}
        </section>
        {bulkModalOpen && (
          <div className="bulk-modal-backdrop" role="presentation" onMouseDown={() => setBulkModalOpen(false)}>
            <form
              className="bulk-edit-modal"
              onSubmit={applyBulkUpdate}
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-edit-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="client-form-heading">
                <div>
                  <h3 id="bulk-edit-title">Aplicar em lote</h3>
                  <span>{selectedCompanyIds.length} empresa(s) selecionada(s). Marque os campos que devem substituir os dados atuais.</span>
                </div>
                <button className="secondary-button" type="button" onClick={() => setBulkModalOpen(false)}>Fechar</button>
              </div>
              <div className="bulk-edit-grid">
                {bulkAccountingFields.map((field) => (
                  <label className={`bulk-field ${bulkFields.includes(field.key) ? "enabled" : ""}`} key={field.key}>
                    <span>
                      <input
                        type="checkbox"
                        checked={bulkFields.includes(field.key)}
                        onChange={() => toggleBulkField(field.key)}
                      />
                      {field.label}
                    </span>
                    {field.kind === "select" ? (
                      <select
                        disabled={!bulkFields.includes(field.key)}
                        value={bulkForm[field.key]}
                        onChange={(event) => setBulkForm({ ...bulkForm, [field.key]: event.target.value })}
                      >
                        <option value="">Selecione</option>
                        {field.options?.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        disabled={!bulkFields.includes(field.key)}
                        value={bulkForm[field.key]}
                        onChange={(event) => setBulkForm({ ...bulkForm, [field.key]: event.target.value })}
                        placeholder={field.placeholder}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="bulk-modal-actions">
                <button className="secondary-button" type="button" onClick={() => setBulkModalOpen(false)}>Cancelar</button>
                <button type="submit">Aplicar aos marcados</button>
              </div>
              {bulkMessage && <span className="client-form-message">{bulkMessage}</span>}
            </form>
          </div>
        )}
        <form
          className="client-form-grid"
          onSubmit={submitCompany}
        >
          <div className="wide client-form-heading">
            <h3>{editingCompanyId ? "Editar empresa" : "Adicionar empresa"}</h3>
            {editingCompanyId && <button className="secondary-button" type="button" onClick={cancelEditingCompany}>Cancelar edicao</button>}
          </div>
          <label>Nome da empresa<input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
          <label>CPF ou CNPJ<input inputMode="numeric" value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: formatCpfCnpj(event.target.value) })} placeholder="000.000.000-00 ou 00.000.000/0000-00" /></label>
          <label>Regime tributario<select value={form.taxRegime} onChange={(event) => setForm({ ...form, taxRegime: event.target.value })}><option value="">Selecione</option><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option><option>MEI</option><option>Nao sei informar</option></select></label>
          <label>Entrega do SPED ECD<select value={form.spedEcdDelivery} onChange={(event) => setForm({ ...form, spedEcdDelivery: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Nao sei informar</option></select></label>

          <h3>Banco e sistema financeiro</h3>
          <label>Possui sistema financeiro para geracao de relatorios que auxiliam a contabilidade?<select value={form.financialSystemReports} onChange={(event) => setForm({ ...form, financialSystemReports: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Em implantacao</option></select></label>
          <label>Utiliza apenas extratos bancarios?<select value={form.onlyBankStatements} onChange={(event) => setForm({ ...form, onlyBankStatements: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Parcialmente</option></select></label>
          <label className="wide">Quais bancos a empresa possui?<input value={form.banksUsed} onChange={(event) => setForm({ ...form, banksUsed: event.target.value })} placeholder="Ex.: Itau, Bradesco, Santander" /></label>
          <label>Media de paginas de cada banco por mes<input value={form.averageBankPages} onChange={(event) => setForm({ ...form, averageBankPages: event.target.value })} placeholder="Ex.: 20 paginas por banco" /></label>
          <label>Possui extratos de aplicacao/CC/EM PDF?<select value={form.hasApplicationStatementsPdf} onChange={(event) => setForm({ ...form, hasApplicationStatementsPdf: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Nao sei informar</option></select></label>
          <label className="wide">Qual sistema utilizado?<input value={form.systemUsed} onChange={(event) => setForm({ ...form, systemUsed: event.target.value })} placeholder="Ex.: Omie, Conta Azul, Bling, sistema proprio" /></label>

          <h3>Situacao contabil</h3>
          <label>Esta com contabilidade em atraso?<select value={form.accountingDelayed} onChange={(event) => setForm({ ...form, accountingDelayed: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Nao sei informar</option></select></label>
          <label>Deseja regularizar a contabilidade?<select value={form.wantsAccountingRegularization} onChange={(event) => setForm({ ...form, wantsAccountingRegularization: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>A avaliar</option></select></label>
          <label className="wide">Fechamento contabil sera feito como?<select value={form.closingFrequency} onChange={(event) => setForm({ ...form, closingFrequency: event.target.value })}><option value="">Selecione</option><option>Mensalmente</option><option>Por demanda</option><option>Outro</option></select></label>

          <h3>SPED ECD/ECF</h3>
          <label>Quer que entregue SPED ECD e ECF?<select value={form.wantsSpedEcdEcf} onChange={(event) => setForm({ ...form, wantsSpedEcdEcf: event.target.value })}><option value="">Selecione</option><option>Sim</option><option>Nao</option><option>Apenas ECD</option><option>Apenas ECF</option><option>A avaliar</option></select></label>
          <label>Qual periodo?<input value={form.spedPeriod} onChange={(event) => setForm({ ...form, spedPeriod: event.target.value })} placeholder="Ex.: 2024, 2025, desde jan/2026" /></label>

          <button type="submit"><FileText size={18} /> {editingCompanyId ? "Salvar alteracoes" : "Salvar empresa"}</button>
          {sentMessage && <span className="client-form-message">{sentMessage}</span>}
        </form>
      </section>
    </ClientShell>
  );
}
