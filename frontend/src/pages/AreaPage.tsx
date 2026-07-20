import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Boxes, Building2, CheckCircle2, CircleHelp, ClipboardList, FileText, GitBranch, PackageCheck, Play, PlayCircle, Plus, Save, Timer, Upload, UsersRound, WalletCards } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Shell from "../components/Shell";
import { API_URL, authHeaders, clientSessionKey, customerName, demandProgress, departmentCatalog, employees, formatDuration, officeName, taskTemplates, uniqueId, useFilteredOperationMap, useOperationState } from "../app/shared";
import type { ClientAccess, ClientPending, Customer, CustomerBasicRegistrationResponse, CustomerContact, Demand, OperationState, OperationTask, Priority, ServiceInterest, Task as ApiTask, TaskStatus } from "../app/shared";

export default function AreaPage() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const map = useFilteredOperationMap();
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

function AreaFrame({ title, subtitle, icon, children, smallHeader = false, backTo, backLabel = "Voltar" }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; smallHeader?: boolean; backTo?: string; backLabel?: string }) {
  const navigate = useNavigate();
  return (
    <Shell>
      <main className="area-page">
        <button className="back-button" onClick={() => backTo ? navigate(backTo) : navigate(-1)}><ArrowLeft size={18} /> {backLabel}</button>
        <section className={`area-hero compact ${smallHeader ? "small" : ""}`}>
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
        cnpj: form.cnpj,
        contacts: [],
        serviceInterests: []
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
      <section className="registration-layout">
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
  const navigate = useNavigate();
  const [lastAccess, setLastAccess] = useState<ClientAccess | null>(null);
  const [saveError, setSaveError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [newOfficeName, setNewOfficeName] = useState("");
  const [officeSearch, setOfficeSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const serviceLabels: Record<ServiceInterest, string> = { contabil: "Contabil", pessoal: "Departamento pessoal", outro: "Outro servico" };
  const emptyForm = {
    officeName: "",
    legalName: "",
    tradeName: "",
    cnpj: "",
    contractAddress: "",
    contractCityState: "",
    contractEmail: "",
    serviceInterests: [] as ServiceInterest[],
    otherServiceDescription: ""
  };
  const emptyContact = () => ({ id: uniqueId("contact"), name: "", role: "", phone: "", email: "" });
  const [form, setForm] = useState(emptyForm);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [editingContactId, setEditingContactId] = useState("");

  function startNewCustomer() {
    setSelectedCustomerId("");
    setLastAccess(null);
    setForm({ ...emptyForm, officeName: state.offices.find((office) => office.id === selectedOfficeId)?.name ?? "" });
    setContacts([]);
    setEditingContactId("");
    setIsCompanyFormOpen(true);
  }

  function selectOffice(officeId: string, officeName: string) {
    setSelectedOfficeId(officeId);
    setSelectedCustomerId("");
    setLastAccess(null);
    setSaveError("");
    setForm({ ...emptyForm, officeName });
    setContacts([]);
    setEditingContactId("");
    setIsCompanyFormOpen(false);
  }

  async function addOffice(event: React.FormEvent) {
    event.preventDefault();
    const name = newOfficeName.trim();
    if (!name || state.offices.some((office) => office.name.toLowerCase() === name.toLowerCase())) return;
    const response = await fetch(`${API_URL}/offices`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      setSaveError("Nao foi possivel cadastrar o escritorio no banco.");
      return;
    }
    const office = await response.json() as OperationState["offices"][number];
    commit((current) => ({ ...current, offices: [...current.offices, office] }));
    setNewOfficeName("");
    selectOffice(office.id, office.name);
  }

  function editCustomer(customer: Customer) {
    setSelectedCustomerId(customer.id);
    setSelectedOfficeId(customer.officeId);
    setLastAccess(null);
    setForm({
      officeName: officeName(state, customer.officeId),
      legalName: customer.legalName,
      tradeName: customer.tradeName ?? "",
      cnpj: customer.cnpj,
      contractAddress: customer.contractAddress ?? "",
      contractCityState: customer.contractCityState ?? "",
      contractEmail: customer.contractEmail ?? "",
      serviceInterests: customer.serviceInterests ?? [],
      otherServiceDescription: customer.otherServiceDescription ?? ""
    });
    setContacts(customer.contacts ?? []);
    setEditingContactId("");
    setIsCompanyFormOpen(true);
  }

  const selectedOffice = state.offices.find((office) => office.id === selectedOfficeId);
  const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const officeSearchTerm = normalizeSearch(officeSearch.trim());
  const companySearchTerm = normalizeSearch(companySearch.trim());
  const displayedOffices = state.offices.filter((office) => normalizeSearch(office.name).includes(officeSearchTerm));
  const displayedCustomers = (selectedOfficeId
    ? state.customers.filter((customer) => customer.officeId === selectedOfficeId)
    : []).filter((customer) => [customer.legalName, customer.tradeName ?? "", customer.cnpj].some((value) => normalizeSearch(value).includes(companySearchTerm)));
  const editingContact = contacts.find((contact) => contact.id === editingContactId);

  async function fillClientPending(customer: Customer, pending: ClientPending) {
    setSaveError("");
    const response = await fetch(`${API_URL}/client/impersonation-token`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ customerId: customer.id, pendingId: pending.id })
    });
    if (!response.ok) {
      setSaveError("Nao foi possivel abrir a pendencia do cliente. Faca login novamente e tente de novo.");
      return;
    }
    const body = await response.json() as { customerId: string; customerName: string; access_token: string };
    localStorage.setItem(clientSessionKey, JSON.stringify({ customerId: body.customerId, customerName: body.customerName, accessToken: body.access_token }));
    navigate(`/cliente/pendencias/${pending.id}`);
  }

  function updateContact(contactId: string, field: keyof Omit<CustomerContact, "id">, value: string) {
    setContacts((current) => current.map((contact) => contact.id === contactId ? { ...contact, [field]: value } : contact));
  }

  function addContact() {
    const contact = emptyContact();
    setContacts((current) => [...current, contact]);
    setEditingContactId(contact.id);
  }

  function removeContact(contactId: string) {
    setContacts((current) => current.filter((contact) => contact.id !== contactId));
    setEditingContactId((current) => current === contactId ? "" : current);
  }

  function toggleServiceInterest(interest: ServiceInterest) {
    setForm((current) => ({
      ...current,
      serviceInterests: current.serviceInterests.includes(interest)
        ? current.serviceInterests.filter((item) => item !== interest)
        : [...current.serviceInterests, interest]
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaveError("");
    if (form.serviceInterests.length === 0) {
      setSaveError("Selecione ao menos um servico para esta empresa.");
      return;
    }
    const cleanContacts = contacts.filter((contact) => contact.name || contact.role || contact.phone || contact.email);

    try {
      const response = await fetch(`${API_URL}/customers/basic-registration`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          ...form,
          contacts: cleanContacts
        })
      });
      if (!response.ok) throw new Error("Falha ao salvar cadastro no banco");
      const apiRegistration = await response.json() as CustomerBasicRegistrationResponse;

      commit((current) => {
        const office = { id: apiRegistration.customer.officeId, name: form.officeName };
        const customer = apiRegistration.customer;
        const clientAccess = apiRegistration.access;
        const accountingPending = apiRegistration.pending;
        return {
          ...current,
          offices: current.offices.some((item) => item.id === office.id) ? current.offices : [...current.offices, office],
          customers: current.customers.some((item) => item.cnpj === form.cnpj)
            ? current.customers.map((item) => item.cnpj === form.cnpj ? customer : item)
            : [...current.customers, customer],
          clientAccesses: clientAccess
            ? [{ ...clientAccess, password: null }, ...current.clientAccesses.filter((item) => item.customerId !== customer.id)]
            : current.clientAccesses,
          clientPendings: accountingPending
            ? [accountingPending, ...current.clientPendings.filter((item) => item.id !== accountingPending.id)]
            : current.clientPendings
        };
      });
      setSelectedCustomerId(apiRegistration.customer.id);
      setLastAccess(apiRegistration.access);
      setIsCompanyFormOpen(false);
    } catch (error) {
      console.error(error);
      setSaveError("Nao foi possivel salvar no banco. Confirme seu login operacional e tente novamente.");
    }
  }

  return (
    <AreaFrame title="Empresas e escritorios" subtitle="Mantenha os escritorios atendidos e uma lista simples das empresas cadastradas." icon={<Building2 />} smallHeader>
      <section className="ops-grid">
        <section className="ops-panel office-panel">
          <h3>Cadastro de escritorios</h3>
          <p className="panel-hint">Cadastre cada escritorio uma única vez. Ele poderá ser associado às empresas.</p>
          <form className="form-grid compact-form" onSubmit={addOffice}>
            <label className="wide">Nome do escritorio<input value={newOfficeName} onChange={(event) => setNewOfficeName(event.target.value)} placeholder="Ex.: Escritorio Alfa Contabil" /></label>
            <button type="submit"><Plus size={18} /> Cadastrar escritorio</button>
          </form>
          <label className="list-search">Pesquisar escritorio<input value={officeSearch} onChange={(event) => setOfficeSearch(event.target.value)} placeholder="Nome do escritorio" /></label>
          <div className="company-table-wrap office-table-wrap">
            <table className="company-table office-table">
              <thead><tr><th>Escritorio</th><th>Empresas vinculadas</th></tr></thead>
              <tbody>{displayedOffices.map((office) => (
                <tr className={selectedOfficeId === office.id ? "active" : ""} key={office.id} onClick={() => selectOffice(office.id, office.name)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectOffice(office.id, office.name); } }}>
                  <td><strong>{office.name}</strong></td><td>{state.customers.filter((customer) => customer.officeId === office.id).length}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {displayedOffices.length === 0 && <p className="empty-state">Nenhum escritorio encontrado.</p>}
        </section>
        <section className="ops-panel registration-companies">
          <div className="customer-list-header">
            <div><h3>Empresas cadastradas</h3><small>{selectedOffice ? `Escritorio: ${selectedOffice.name}` : "Selecione um escritorio para visualizar as empresas"}</small></div>
            <button type="button" onClick={startNewCustomer} disabled={!selectedOffice}><Plus size={18} /> Nova empresa</button>
          </div>
          <label className="list-search">Pesquisar empresa<input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Razao social, nome fantasia ou CNPJ" disabled={!selectedOffice} /></label>
          {lastAccess && (
            <article className="client-access-card">
              <strong>Acesso do cliente criado</strong>
              <span>Login: {lastAccess.email}</span>
              {lastAccess.password ? <span>Senha temporaria: {lastAccess.password}</span> : <span>Senha ja criada anteriormente.</span>}
              <small>Encaminhe estes dados para o cliente acessar /cliente/login.</small>
            </article>
          )}
          {selectedOffice && displayedCustomers.length > 0 && (
            <div className="company-table-wrap">
              <table className="company-table">
                <thead><tr><th>Empresa</th><th>CNPJ</th><th>Serviços</th><th>Pendências</th><th>Ações</th></tr></thead>
                <tbody>
                  {displayedCustomers.map((customer) => {
                    const pending = state.clientPendings.find((item) => item.customerId === customer.id && item.status !== "enviada");
                    const pendingCount = state.clientPendings.filter((item) => item.customerId === customer.id && item.status !== "enviada").length;
                    return (
                      <tr
                        className={selectedCustomerId === customer.id ? "active" : ""}
                        key={customer.id}
                        onClick={() => editCustomer(customer)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            editCustomer(customer);
                          }
                        }}
                      >
                        <td><strong>{customer.legalName}</strong>{customer.tradeName && <small>{customer.tradeName}</small>}</td>
                        <td>{customer.cnpj}</td>
                        <td>{(customer.serviceInterests ?? []).map((service) => serviceLabels[service]).join(", ") || "—"}</td>
                        <td>{pendingCount || "—"}</td>
                        <td>{pending && <button className="secondary-button" type="button" onClick={(event) => { event.stopPropagation(); fillClientPending(customer, pending); }}><FileText size={16} /> Preencher</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {selectedOffice && displayedCustomers.length === 0 && <p className="empty-state">Nenhuma empresa encontrada para este escritorio.</p>}
          {!selectedOffice && <p className="empty-state">Selecione um escritorio na lista ao lado.</p>}
        </section>
      </section>
      {isCompanyFormOpen && (
        <div className="company-drawer-backdrop" onMouseDown={() => setIsCompanyFormOpen(false)}>
          <form className="company-drawer form-grid" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
            <div className="wide registration-form-header">
              <div><h3>{selectedCustomerId ? "Editar empresa" : "Nova empresa"}</h3><small>Dados principais para o cadastro</small></div>
              <button className="secondary-button" type="button" onClick={() => setIsCompanyFormOpen(false)}>Fechar</button>
            </div>
            <label>Escritorio<select value={form.officeName} onChange={(event) => setForm({ ...form, officeName: event.target.value })} required><option value="">Selecione um escritorio</option>{state.offices.map((office) => <option key={office.id} value={office.name}>{office.name}</option>)}</select></label>
            <label>Razao social<input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} required /></label>
            <label>Nome fantasia<input value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} /></label>
            <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} required /></label>
            <div className="wide required-services">
              <h3>Serviços a executar <span>*</span></h3>
              <div className="checklist service-checklist">{[["contabil", "Servico contabil"], ["pessoal", "Departamento pessoal"], ["outro", "Outro servico"]].map(([service, label]) => <label key={service}><input type="checkbox" checked={form.serviceInterests.includes(service as ServiceInterest)} onChange={() => toggleServiceInterest(service as ServiceInterest)} /><span>{label}</span></label>)}</div>
              {form.serviceInterests.includes("outro") && <label>Qual outro servico?<input value={form.otherServiceDescription} onChange={(event) => setForm({ ...form, otherServiceDescription: event.target.value })} /></label>}
            </div>
            <details className="wide company-extra-fields">
              <summary>Dados complementares (opcional)</summary>
              <div className="form-grid">
                <label className="wide">Endereco para contrato<input value={form.contractAddress} onChange={(event) => setForm({ ...form, contractAddress: event.target.value })} /></label>
                <label>Cidade/UF<input value={form.contractCityState} onChange={(event) => setForm({ ...form, contractCityState: event.target.value })} /></label>
                <label>Email para contrato<input value={form.contractEmail} onChange={(event) => setForm({ ...form, contractEmail: event.target.value })} /></label>
                <div className="wide contacts-section">
                  <div className="contacts-section-header"><strong>Contatos ({contacts.length})</strong><button className="secondary-button" type="button" onClick={addContact}><Plus size={18} /> Adicionar contato</button></div>
                  {contacts.length > 0 && <div className="company-table-wrap"><table className="company-table contacts-table"><thead><tr><th>Nome</th><th>Função</th><th>Telefone</th><th>E-mail</th></tr></thead><tbody>{contacts.map((contact) => <tr className={editingContactId === contact.id ? "active" : ""} key={contact.id} onClick={() => setEditingContactId(contact.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditingContactId(contact.id); } }}><td>{contact.name || "—"}</td><td>{contact.role || "—"}</td><td>{contact.phone || "—"}</td><td>{contact.email || "—"}</td></tr>)}</tbody></table></div>}
                  {contacts.length === 0 && <p className="empty-state">Nenhum contato cadastrado.</p>}
                  {editingContact && <section className="contact-editor"><div className="contact-editor-header"><strong>{editingContact.name ? `Editar ${editingContact.name}` : "Novo contato"}</strong><button className="secondary-button" type="button" onClick={() => removeContact(editingContact.id)}>Remover</button></div><label>Nome<input value={editingContact.name} onChange={(event) => updateContact(editingContact.id, "name", event.target.value)} /></label><label>Função na empresa<input value={editingContact.role} onChange={(event) => updateContact(editingContact.id, "role", event.target.value)} /></label><label>Telefone<input value={editingContact.phone} onChange={(event) => updateContact(editingContact.id, "phone", event.target.value)} /></label><label>E-mail<input value={editingContact.email} onChange={(event) => updateContact(editingContact.id, "email", event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => setEditingContactId("")}>Concluir edição</button></section>}
                </div>
              </div>
            </details>
            <button type="submit"><Save size={18} /> {selectedCustomerId ? "Salvar alteracoes" : "Salvar empresa"}</button>
            {saveError && <span className="form-error wide">{saveError}</span>}
          </form>
        </div>
      )}
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

function SortableTaskTable({ tasks, selectedTaskId, onSelectTask, showAdmissionStage = false }: { tasks: ApiTask[]; selectedTaskId?: number | null; onSelectTask?: (task: ApiTask) => void; showAdmissionStage?: boolean }) {
  const [sort, setSort] = useState<{ column: "code" | "priority" | "company" | "employee" | "requested" | "status" | "station" | "stage"; direction: "asc" | "desc" }>({ column: "code", direction: "asc" });
  const [search, setSearch] = useState("");
  const priorityRank: Record<string, number> = { critica: 0, alta: 1, normal: 2, baixa: 3 };
  const stationLabel = (stationId?: string | null) => departmentCatalog.pessoal.stations.find((station) => station.id === stationId)?.title ?? "Sem esteira";
  const statusLabel: Record<string, string> = { waiting_release: "Aguardando liberação", pending: "Liberada", running: "Em execução", blocked: "Aguardando", done: "Concluída", done_waiting: "Concluída" };
  const stageLabel: Record<string, string> = { conference: "Conferência", registration: "Cadastro", esocial: "eSocial", contracts: "Contratos", communication: "Comunicação", completed: "Concluída" };
  const filteredTasks = tasks.filter((task) => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return true;
    return [task.task_code ?? `T-${String(task.id).padStart(6, "0")}`, task.client_name, task.employee_name, stationLabel(task.station_id), stageLabel[task.workflow_stage ?? ""] ?? statusLabel[task.status] ?? task.status, task.priority, task.requested_at].some((value) => value?.toLocaleLowerCase().includes(term));
  });
  const sortedTasks = [...filteredTasks].sort((first, second) => {
    const value = (task: ApiTask) => {
      if (sort.column === "code") return task.id;
      if (sort.column === "priority") return priorityRank[task.priority] ?? 9;
      if (sort.column === "company") return task.client_name;
      if (sort.column === "employee") return task.employee_name ?? "";
      if (sort.column === "requested") return task.requested_at ?? "";
      if (sort.column === "station") return stationLabel(task.station_id);
      if (sort.column === "stage") return stageLabel[task.workflow_stage ?? ""] ?? "Conferência";
      return statusLabel[task.status] ?? task.status;
    };
    const a = value(first);
    const b = value(second);
    const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR");
    return sort.direction === "asc" ? comparison : -comparison;
  });
  const sortBy = (column: typeof sort.column) => setSort((current) => current.column === column ? { column, direction: current.direction === "asc" ? "desc" : "asc" } : { column, direction: "asc" });
  const header = (column: typeof sort.column, label: string) => <button type="button" onClick={() => sortBy(column)}>{label}{sort.column === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}</button>;
  return <div className="task-queue-table"><label className="task-queue-search">Buscar na fila<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, empresa, colaborador ou etapa" /></label><div className="company-table-wrap"><table className="company-table"><thead><tr><th>{header("code", "Código")}</th><th>{header("priority", "Prioridade")}</th><th>{header("company", "Empresa")}</th><th>{header("employee", "Colaborador")}</th>{!showAdmissionStage && <th>{header("station", "Esteira")}</th>}<th>{header("requested", "Solicitada em")}</th><th>{showAdmissionStage ? header("stage", "Etapa") : header("status", "Status")}</th></tr></thead><tbody>{sortedTasks.map((task) => <tr className={selectedTaskId === task.id ? "selected-task" : onSelectTask ? "selectable-task" : ""} onClick={() => onSelectTask?.(task)} key={task.id}><td><strong>{task.task_code ?? `T-${String(task.id).padStart(6, "0")}`}</strong></td><td><span className={`priority-badge ${task.priority}`}>{task.priority}</span></td><td>{task.client_name}</td><td>{task.employee_name ?? "—"}</td>{!showAdmissionStage && <td>{stationLabel(task.station_id)}</td>}<td>{task.requested_at ?? "—"}</td><td>{showAdmissionStage ? (stageLabel[task.workflow_stage ?? ""] ?? "Conferência") : (statusLabel[task.status] ?? task.status)}</td></tr>)}{sortedTasks.length === 0 && <tr><td colSpan={showAdmissionStage ? 6 : 7} className="empty-state">Sem tarefas encontradas.</td></tr>}</tbody></table></div></div>;
}

function DepartmentArea({ departmentId, store }: { departmentId: "contabil" | "pessoal"; store: ReturnType<typeof useOperationState> }) {
  const { state } = store;
  const department = departmentCatalog[departmentId];
  const map = useFilteredOperationMap();
  const [accountingAssigneeFilter, setAccountingAssigneeFilter] = useState("todos");
  const [personnelQueueFilter, setPersonnelQueueFilter] = useState<"checklist" | "available" | "warning" | "overdue" | null>(null);
  const [personnelSettings, setPersonnelSettings] = useState({ admissionSlaDays: 1, terminationSlaDays: 2, vacationSlaDays: 3, payrollDueDay: 25, criticalStartDay: 20, criticalEndDay: 25, warningDays: 1 });
  const [settingsSaved, setSettingsSaved] = useState("");

  useEffect(() => {
    if (departmentId !== "pessoal") return;
    fetch(`${API_URL}/personnel-settings`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => body && setPersonnelSettings(body)).catch(() => undefined);
  }, [departmentId]);

  async function savePersonnelSettings() {
    const response = await fetch(`${API_URL}/personnel-settings`, { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(personnelSettings) });
    setSettingsSaved(response.ok ? "Configuracoes salvas." : "Nao foi possivel salvar.");
  }

  if (departmentId === "contabil") {
    const accountingTasks = map.tasks.filter((task) => task.area_id === "contabil" && task.title === "Folha contabil mensal");
    const assignees = Array.from(new Set(accountingTasks.map((task) => task.assignee).filter((value): value is string => Boolean(value)))).sort();
    const filteredTasks = accountingTasks
      .filter((task) => accountingAssigneeFilter === "todos" || (accountingAssigneeFilter === "sem_responsavel" ? !task.assignee : task.assignee === accountingAssigneeFilter))
      .sort((a, b) => ({ critica: 0, alta: 1, normal: 2, baixa: 3 }[a.priority] ?? 4) - ({ critica: 0, alta: 1, normal: 2, baixa: 3 }[b.priority] ?? 4));
    const officeProgress = state.offices.map((office) => {
      const companies = state.customers.filter((customer) => customer.officeId === office.id && customer.serviceInterests?.includes("contabil"));
      const tasks = accountingTasks.filter((task) => companies.some((customer) => [customer.tradeName, customer.legalName].includes(task.client_name)));
      return { office, total: companies.length, done: tasks.filter((task) => task.status === "done").length };
    }).filter((item) => item.total > 0);
    return (
      <AreaFrame title="Departamento Contabil" subtitle="Acompanhe as folhas por escritorio e organize a fila geral de prioridade do setor." icon={<Boxes />} smallHeader backTo="/" backLabel="Sair">
        <section className="accounting-overview">
          <section className="ops-panel"><div className="customer-list-header"><div><h3>Progresso por escritorio</h3><small>Folhas de todas as empresas com servico contabil</small></div></div><div className="office-progress-list">{officeProgress.map(({ office, total, done }) => { const missing = Math.max(total - done, 0); return <article key={office.id}><div><strong>{office.name}</strong><small>{done} de {total} folhas concluidas</small></div><div className="office-progress-bar"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div><strong className={missing ? "missing" : "complete"}>{missing} faltando</strong></article>; })}</div></section>
          <section className="ops-panel accounting-priority"><div className="customer-list-header"><div><h3>Fila geral de prioridade</h3><small>{filteredTasks.length} folhas no filtro atual</small></div><label className="inline-filter">Responsavel<select value={accountingAssigneeFilter} onChange={(event) => setAccountingAssigneeFilter(event.target.value)}><option value="todos">Todos</option><option value="sem_responsavel">Sem responsavel</option>{assignees.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}</select></label></div><div className="company-table-wrap"><table className="company-table accounting-queue"><thead><tr><th>Prioridade</th><th>Empresa</th><th>Responsavel</th></tr></thead><tbody>{filteredTasks.map((task) => <tr key={task.id}><td><span className={`priority-badge ${task.priority}`}>{task.priority}</span></td><td><strong>{task.client_name}</strong></td><td>{task.assignee ?? <span className="unassigned">Sem responsavel</span>}</td></tr>)}</tbody></table></div></section>
        </section>
      </AreaFrame>
    );
  }

  if (departmentId === "pessoal") {
    const personnelTasks = map.tasks.filter((task) => task.area_id === "pessoal" && task.station_id);
    const now = new Date();
    const criticalPeriod = now.getDate() >= personnelSettings.criticalStartDay && now.getDate() <= personnelSettings.criticalEndDay;
    const deadlineFor = (task: typeof personnelTasks[number], stationId: string) => {
      if (stationId === "folha") return new Date(now.getFullYear(), now.getMonth(), personnelSettings.payrollDueDay, 23, 59, 59);
      const sla = stationId === "admissoes" ? personnelSettings.admissionSlaDays : stationId === "rescisoes" ? personnelSettings.terminationSlaDays : personnelSettings.vacationSlaDays;
      const date = new Date(`${task.requested_at ?? now.toISOString().slice(0, 10)}T23:59:59`);
      date.setDate(date.getDate() + sla);
      return date;
    };
    const daysToDeadline = (task: typeof personnelTasks[number], stationId: string) => Math.ceil((deadlineFor(task, stationId).getTime() - now.getTime()) / 86400000);
    const openPersonnelTasks = personnelTasks.filter((task) => task.status !== "done" && task.status !== "manager_review");
    const managerReviewTasks = personnelTasks.filter((task) => task.status === "manager_review");
    const globalChecklistPending = openPersonnelTasks.filter((task) => !task.checklist_ready).length;
    const globalAvailable = openPersonnelTasks.filter((task) => task.checklist_ready && task.status === "pending").length;
    const globalWarning = openPersonnelTasks.filter((task) => task.checklist_ready && daysToDeadline(task, task.station_id!) >= 0 && daysToDeadline(task, task.station_id!) <= personnelSettings.warningDays).length;
    const globalOverdue = openPersonnelTasks.filter((task) => task.checklist_ready && daysToDeadline(task, task.station_id!) < 0).length;
    const queueTasks = openPersonnelTasks.filter((task) => {
      if (personnelQueueFilter === "checklist") return !task.checklist_ready;
      if (personnelQueueFilter === "available") return task.checklist_ready && task.status === "pending";
      if (personnelQueueFilter === "warning") return task.checklist_ready && daysToDeadline(task, task.station_id!) >= 0 && daysToDeadline(task, task.station_id!) <= personnelSettings.warningDays;
      if (personnelQueueFilter === "overdue") return task.checklist_ready && daysToDeadline(task, task.station_id!) < 0;
      return true;
    });
    const toggleQueueFilter = (filter: NonNullable<typeof personnelQueueFilter>) => setPersonnelQueueFilter((current) => current === filter ? null : filter);
    return (
      <AreaFrame title="Departamento Pessoal" subtitle="Visao fabril das filas, prioridades e liberacoes de cada linha de producao." icon={<UsersRound />} smallHeader backTo="/" backLabel="Sair">
        <div className="personnel-overview-actions"><div><strong>Demandas pontuais</strong><span>Registre admissões, rescisões e férias para entrarem na esteira correta.</span></div><Link to="/area/pessoal/solicitacoes/nova"><Plus size={17} /> Nova solicitação</Link></div>
        {criticalPeriod && <div className="closing-alert"><strong>Periodo critico de fechamento ativo</strong><span>As tarefas do Departamento Pessoal devem receber prioridade reforcada ate o dia {personnelSettings.criticalEndDay}.</span></div>}
        <details className="personnel-settings-panel"><summary>Configurar prazos e periodo critico</summary><div className="settings-grid"><label>Admissao (dias)<input type="number" min="1" value={personnelSettings.admissionSlaDays} onChange={(event) => setPersonnelSettings({ ...personnelSettings, admissionSlaDays: Number(event.target.value) })} /></label><label>Rescisao (dias)<input type="number" min="1" value={personnelSettings.terminationSlaDays} onChange={(event) => setPersonnelSettings({ ...personnelSettings, terminationSlaDays: Number(event.target.value) })} /></label><label>Ferias (dias)<input type="number" min="1" value={personnelSettings.vacationSlaDays} onChange={(event) => setPersonnelSettings({ ...personnelSettings, vacationSlaDays: Number(event.target.value) })} /></label><label>Fechar folha ate o dia<input type="number" min="1" max="31" value={personnelSettings.payrollDueDay} onChange={(event) => setPersonnelSettings({ ...personnelSettings, payrollDueDay: Number(event.target.value) })} /></label><label>Inicio periodo critico<input type="number" min="1" max="31" value={personnelSettings.criticalStartDay} onChange={(event) => setPersonnelSettings({ ...personnelSettings, criticalStartDay: Number(event.target.value) })} /></label><label>Fim periodo critico<input type="number" min="1" max="31" value={personnelSettings.criticalEndDay} onChange={(event) => setPersonnelSettings({ ...personnelSettings, criticalEndDay: Number(event.target.value) })} /></label><label>Alertar antes (dias)<input type="number" min="0" value={personnelSettings.warningDays} onChange={(event) => setPersonnelSettings({ ...personnelSettings, warningDays: Number(event.target.value) })} /></label><button type="button" onClick={savePersonnelSettings}><Save size={16} /> Salvar configuracoes</button>{settingsSaved && <span>{settingsSaved}</span>}</div></details>
        <section className="personnel-alert-lanes">
          {department.stations.filter((station) => station.id !== "analise-gestor").map((station) => {
            const tasks = openPersonnelTasks.filter((task) => task.station_id === station.id);
            const openTasks = tasks.filter((task) => task.status !== "done");
            const overdue = openTasks.filter((task) => task.checklist_ready && daysToDeadline(task, station.id) < 0).length;
            const warning = openTasks.filter((task) => task.checklist_ready && daysToDeadline(task, station.id) >= 0 && daysToDeadline(task, station.id) <= personnelSettings.warningDays).length;
            const blocked = openTasks.filter((task) => !task.checklist_ready).length;
            const available = openTasks.filter((task) => task.checklist_ready && task.status === "pending").length;
            const nearest = openTasks.filter((task) => task.checklist_ready).sort((a, b) => daysToDeadline(a, station.id) - daysToDeadline(b, station.id))[0];
            return (
              <Link className={`personnel-alert-card ${overdue ? "danger" : warning ? "warning" : "normal"}`} to={`/area/pessoal/station/${station.id}`} key={station.id}><header><div><span className="machine-light" /><strong>{station.title}</strong></div><span>{tasks.length} solicitacoes</span></header><div className="alert-numbers"><div className="locked"><strong>{blocked}</strong><span>checklist pendente</span></div><div className="available"><strong>{available}</strong><span>liberadas</span></div><div className="warning"><strong>{warning}</strong><span>proximas do prazo</span></div><div className="danger"><strong>{overdue}</strong><span>atrasadas</span></div></div><footer><span>{station.id === "folha" ? `Prazo mensal: dia ${personnelSettings.payrollDueDay}` : nearest ? `Proximo prazo em ${Math.max(daysToDeadline(nearest, station.id), 0)} dia(s)` : "Sem prazo pendente"}</span><strong>Ver fila da esteira →</strong></footer></Link>
            );
          })}
          <Link className={`personnel-alert-card ${managerReviewTasks.length ? "warning" : "normal"}`} to="/area/pessoal/station/analise-gestor"><header><div><span className="machine-light" /><strong>Análise do Gestor</strong></div><span>{managerReviewTasks.length} peça(s)</span></header><div className="alert-numbers"><div className="warning"><strong>{managerReviewTasks.length}</strong><span>aguardando análise</span></div></div><footer><span>Saída de qualidade após a entrega ao cliente</span><strong>Abrir ponto de análise →</strong></footer></Link>
        </section>
        <section className="personnel-summary personnel-queue-filters" aria-label="Filtros da fila de demandas">
          <button className={personnelQueueFilter === "checklist" ? "active" : ""} type="button" onClick={() => toggleQueueFilter("checklist")}><ClipboardList /><span>Checklist pendente</span><strong>{globalChecklistPending}</strong></button>
          <button className={personnelQueueFilter === "available" ? "active" : ""} type="button" onClick={() => toggleQueueFilter("available")}><CheckCircle2 /><span>Liberadas</span><strong>{globalAvailable}</strong></button>
          <button className={personnelQueueFilter === "warning" ? "active" : ""} type="button" onClick={() => toggleQueueFilter("warning")}><Timer /><span>Próximas do prazo</span><strong>{globalWarning}</strong></button>
          <button className={personnelQueueFilter === "overdue" ? "active" : ""} type="button" onClick={() => toggleQueueFilter("overdue")}><PlayCircle /><span>Atrasadas</span><strong>{globalOverdue}</strong></button>
        </section>
        <section className="ops-panel personnel-task-queue"><div className="customer-list-header"><div><h3>Fila de demandas</h3><small>{personnelQueueFilter ? `${queueTasks.length} demanda(s) no filtro selecionado. Clique novamente no filtro para limpar.` : "Clique em qualquer coluna para ordenar a fila operacional."}</small></div>{personnelQueueFilter && <button className="secondary-button" type="button" onClick={() => setPersonnelQueueFilter(null)}>Limpar filtro</button>}</div><SortableTaskTable tasks={queueTasks} /></section>
      </AreaFrame>
    );
  }
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

export function PersonnelRequestPage() {
  const navigate = useNavigate();
  const { state } = useOperationState();
  const personnelCustomers = state.customers.filter((customer) => customer.serviceInterests?.includes("pessoal"));
  const [companySearch, setCompanySearch] = useState("");
  const [companyListOpen, setCompanyListOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    stationId: "admissoes",
    employeeName: "",
    requestedAt: new Date().toISOString().slice(0, 10),
    priority: "normal",
    checklistReady: false,
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const matchingCustomers = personnelCustomers.filter((customer) => {
    const term = companySearch.trim().toLocaleLowerCase();
    if (!term) return true;
    return [customer.tradeName, customer.legalName, officeName(state, customer.officeId)].some((value) => value?.toLocaleLowerCase().includes(term));
  });

  function chooseCustomer(customer: Customer) {
    setForm({ ...form, customerId: customer.id });
    setCompanySearch(customer.tradeName || customer.legalName);
    setCompanyListOpen(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!form.customerId) {
      setMessage("Selecione a empresa solicitante.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/personnel-requests`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(body?.detail ?? "Não foi possível criar a solicitação.");
      }
      navigate("/area/pessoal");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a solicitação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AreaFrame title="Nova solicitação" subtitle="Crie uma demanda pontual e encaminhe-a diretamente para a esteira do Departamento Pessoal." icon={<ClipboardList />} smallHeader>
      <form className="ops-panel personnel-request-form" onSubmit={submit}>
        <div className="personnel-request-heading"><div><h3>Dados da solicitação</h3><p>O checklist inicial define se a tarefa já entra liberada para execução.</p></div><span>Não recorrente</span></div>
        <div className="form-grid">
          <label className="wide personnel-company-picker">Empresa solicitante<input required value={companySearch} onFocus={() => setCompanyListOpen(true)} onChange={(event) => { setCompanySearch(event.target.value); setForm({ ...form, customerId: "" }); setCompanyListOpen(true); }} placeholder="Digite o nome da empresa ou do escritório" autoComplete="off" />{companyListOpen && <div className="personnel-company-options">{matchingCustomers.map((customer) => <button type="button" key={customer.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCustomer(customer)}><strong>{customer.tradeName || customer.legalName}</strong><span>{customer.legalName} · {officeName(state, customer.officeId)}</span></button>)}{matchingCustomers.length === 0 && <p>Nenhuma empresa com Departamento Pessoal encontrada.</p>}</div>}</label>
          <label>Tipo de solicitação<select value={form.stationId} onChange={(event) => setForm({ ...form, stationId: event.target.value })}><option value="admissoes">Admissão</option><option value="rescisoes">Rescisão</option><option value="ferias">Férias</option></select></label>
          <label>Nome do colaborador<input required value={form.employeeName} onChange={(event) => setForm({ ...form, employeeName: event.target.value })} placeholder="Nome completo" /></label>
          <label>Data da solicitação<input required type="date" value={form.requestedAt} onChange={(event) => setForm({ ...form, requestedAt: event.target.value })} /></label>
          <label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
          <label className="wide">Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Informações relevantes para a equipe responsável" /></label>
        </div>
        <label className="personnel-release-choice"><input type="checkbox" checked={form.checklistReady} onChange={(event) => setForm({ ...form, checklistReady: event.target.checked })} /><span><strong>Checklist inicial concluído</strong><small>{form.checklistReady ? "A tarefa será criada como liberada para execução." : "A tarefa ficará aguardando a liberação do checklist."}</small></span></label>
        {message && <p className="personnel-request-message">{message}</p>}
        <footer><button type="button" onClick={() => navigate("/area/pessoal")}>Cancelar</button><button type="submit" disabled={saving || personnelCustomers.length === 0}>{saving ? "Criando..." : "Criar solicitação"}</button></footer>
      </form>
    </AreaFrame>
  );
}

function AdmissionWorkstationPage() {
  const navigate = useNavigate();
  const map = useFilteredOperationMap();
  const [searchParams, setSearchParams] = useSearchParams();
  const allAdmissionTasks = map.tasks.filter((task) => task.area_id === "pessoal" && task.station_id === "admissoes");
  const tasks = allAdmissionTasks.filter((task) => task.status !== "manager_review" && task.status !== "done" && task.workflow_stage !== "completed");
  const requestedTaskId = Number(searchParams.get("task")) || null;
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(requestedTaskId ?? tasks[0]?.id ?? null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<{ stepKey: string; status: string; assignee?: string | null; releasedAt?: string | null; completedAt?: string | null }[]>([]);
  const [taskHistory, setTaskHistory] = useState<{ id: number; message: string; occurredAt: string }[]>([]);
  const [taskNotes, setTaskNotes] = useState<{ id: number; body: string; author: string; createdAt: string; updatedAt?: string | null }[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [records, setRecords] = useState<Record<number, { documents: Record<string, { name: string; contentType: string }>; released: boolean; form: { employee: string; admissionDate: string; role: string; salary: string; startTime: string; endTime: string; breakStart: string; breakEnd: string; weeklyRest: string; weeklyRestOther: string; phone: string; race: string; probation: string; maritalStatus: string; reservistRequired: boolean; driver: boolean; childDependent: boolean; email: string; education: string; overtime: string; transport: string; healthPlan: string; specialNotes: string } }>>({});
  const [checklistLoadedTaskId, setChecklistLoadedTaskId] = useState<number | null>(null);
  const selectedTask = allAdmissionTasks.find((task) => task.id === selectedTaskId);
  useEffect(() => { if (selectedTaskId === null && tasks[0]) setSelectedTaskId(tasks[0].id); }, [selectedTaskId, tasks]);
  useEffect(() => { setChecklistOpen(selectedTask?.status === "waiting_release" || !selectedTask?.checklist_ready); }, [selectedTask?.id, selectedTask?.status, selectedTask?.checklist_ready]);
  useEffect(() => { if (!selectedTaskId) return; fetch(`${API_URL}/admission-workflows/${selectedTaskId}`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => body && setWorkflowSteps(body.steps)).catch(() => setWorkflowSteps([])); }, [selectedTaskId]);
  useEffect(() => { if (!selectedTaskId) return; setNoteDraft(""); setEditingNoteId(null); fetch(`${API_URL}/tasks/${selectedTaskId}/notes`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => body && setTaskNotes(body.notes)).catch(() => setTaskNotes([])); }, [selectedTaskId]);
  useEffect(() => { if (!selectedTaskId) return; fetch(`${API_URL}/tasks/${selectedTaskId}/history`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => body && setTaskHistory(body.events)).catch(() => setTaskHistory([])); }, [selectedTaskId, workflowSteps, taskNotes]);
  const emptyForm = (employee = "") => ({ employee, admissionDate: "", role: "", salary: "", startTime: "", endTime: "", breakStart: "", breakEnd: "", weeklyRest: "", weeklyRestOther: "", phone: "", race: "", probation: "", maritalStatus: "", reservistRequired: false, driver: false, childDependent: false, email: "", education: "", overtime: "", transport: "", healthPlan: "", specialNotes: "" });
  const record = selectedTaskId === null ? undefined : records[selectedTaskId];
  const form = record?.form ?? emptyForm(selectedTask?.employee_name ?? "");
  const documents = record?.documents ?? {};
  const released = record?.released ?? false;
  useEffect(() => {
    if (!selectedTaskId) return;
    setChecklistLoadedTaskId(null);
    fetch(`${API_URL}/admissions/${selectedTaskId}`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (!body) return;
      const formData = { ...emptyForm(selectedTask?.employee_name ?? ""), ...body.form };
      const savedDocuments = Object.fromEntries((body.documents ?? []).map((item: { documentKey: string; fileName: string; contentType: string }) => [item.documentKey, { name: item.fileName, contentType: item.contentType }]));
      setRecords((current) => ({ ...current, [selectedTaskId]: { form: formData, documents: savedDocuments, released: body.released } }));
      setChecklistLoadedTaskId(selectedTaskId);
    }).catch(() => setChecklistLoadedTaskId(null));
  }, [selectedTaskId]);
  useEffect(() => {
    if (!selectedTaskId || checklistLoadedTaskId !== selectedTaskId) return;
    const timer = window.setTimeout(() => { void fetch(`${API_URL}/admissions/${selectedTaskId}`, { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ form, released }) }); }, 500);
    return () => window.clearTimeout(timer);
  }, [selectedTaskId, checklistLoadedTaskId, form, released]);
  function updateRecord(change: (current: NonNullable<typeof record>) => NonNullable<typeof record>) {
    if (selectedTaskId === null) return;
    setRecords((current) => {
      const selected = current[selectedTaskId] ?? { documents: {}, released: false, form: emptyForm(selectedTask?.employee_name ?? "") };
      return { ...current, [selectedTaskId]: change(selected) };
    });
  }
  function updateForm(nextForm: typeof form) { updateRecord((current) => ({ ...current, form: nextForm })); }
  function updateDocuments(nextDocuments: Record<string, { name: string; contentType: string } | File>) {
    const uploads = Object.entries(nextDocuments).filter((entry): entry is [string, File] => entry[1] instanceof File);
    const persistedDocuments = Object.fromEntries(Object.entries(nextDocuments).map(([id, file]) => [id, file instanceof File ? { name: file.name, contentType: file.type || "application/octet-stream" } : file]));
    updateRecord((current) => ({ ...current, documents: persistedDocuments }));
    uploads.forEach(([id, file]) => { void uploadDocument(id, file); });
  }
  const requiredDocuments = [
    ["cpf", "CPF", true], ["identity", "Carteira de identidade", true], ["voter", "Titulo de eleitor", true],
    ["reservist", "Certificado de reservista", form.reservistRequired], ["aso", "Atestado de saude ocupacional (ASO)", true],
    ["address", "Comprovante de residencia", true], ["license", "Carteira de habilitacao", form.driver],
    ["children", "Certidao de nascimento e CPF dos filhos", form.childDependent]
  ] as const;
  const optionalDocuments = ["Certidao de casamento/divorcio e CPF do conjuge", "Caderneta de vacinacao dos filhos", "Comprovante de escolaridade dos dependentes", "Declaracao escolar do menor estudante"];
  const activeRequiredDocuments = requiredDocuments.filter((item) => item[2]);
  const requiredFields = [form.employee, form.admissionDate, form.role, form.salary, form.startTime, form.endTime, form.breakStart, form.breakEnd, form.weeklyRest, form.weeklyRest !== "Outras situações" || form.weeklyRestOther, form.phone, form.race, form.probation, form.maritalStatus];
  const completedDocuments = activeRequiredDocuments.filter(([id]) => documents[id]).length;
  const completedFields = requiredFields.filter(Boolean).length;
  const totalRequired = activeRequiredDocuments.length + requiredFields.length;
  const completedRequired = completedDocuments + completedFields;
  const canRelease = completedRequired === totalRequired;
  const complementaryFields = [form.email, form.education, form.overtime, form.transport, form.healthPlan, form.specialNotes];
  const completedComplementary = optionalDocuments.filter((_, index) => documents[`optional-${index}`]).length + complementaryFields.filter(Boolean).length;
  const totalComplementary = optionalDocuments.length + complementaryFields.length;
  const pendingComplementary = totalComplementary - completedComplementary;

  function canPreviewDocument(file: { contentType: string }) {
    return file.contentType === "application/pdf" || file.contentType.startsWith("image/") || file.contentType.startsWith("text/");
  }

  async function openDocument(documentId: string) {
    const file = documents[documentId];
    if (!file) return;
    const previewWindow = canPreviewDocument(file) ? window.open("", "_blank") : null;
    const response = await fetch(`${API_URL}/admissions/${selectedTaskId}/documents/${documentId}`, { headers: authHeaders() });
    if (!response.ok) { previewWindow?.close(); return; }
    const url = URL.createObjectURL(await response.blob());
    if (canPreviewDocument(file)) {
      if (previewWindow) previewWindow.location.href = url;
      else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      }
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function uploadDocument(documentId: string, selectedFile: File) {
    if (!selectedTaskId) return;
    const payload = new FormData();
    payload.append("file", selectedFile);
    const response = await fetch(`${API_URL}/admissions/${selectedTaskId}/documents/${documentId}`, { method: "POST", headers: authHeaders(), body: payload });
    if (!response.ok) return;
    const saved = await response.json();
    updateDocuments({ ...documents, [documentId]: { name: saved.fileName, contentType: saved.contentType } });
  }

  function field(name: keyof typeof form, label: string, type = "text", required = true) {
    if (name === "weeklyRest") return <><label className="required-field"><span className="field-label">Descanso semanal<b className="required-mark">*</b></span><select value={form.weeklyRest} onChange={(event) => updateForm({ ...form, weeklyRest: event.target.value, weeklyRestOther: event.target.value === "Outras situações" ? form.weeklyRestOther : "" })} required><option value="" disabled>Selecione</option><option value="Sábado">Sábado</option><option value="Domingo">Domingo</option><option value="Sábado/Domingo">Sábado/Domingo</option><option value="Outras situações">Outras situações</option></select></label>{form.weeklyRest === "Outras situações" && <label className="required-field"><span className="field-label">Dia da folga<b className="required-mark">*</b></span><input value={form.weeklyRestOther} onChange={(event) => updateForm({ ...form, weeklyRestOther: event.target.value })} required placeholder="Ex.: sexta-feira" /></label>}</>;
    return <label className={`${required ? "required-field" : ""} ${type === "time" ? "time-field" : ""}`}><span className="field-label">{label}{required && <b className="required-mark">*</b>}</span><input type={type} value={String(form[name])} onChange={(event) => updateForm({ ...form, [name]: event.target.value })} required={required} /></label>;
  }

  async function completeWorkflowStep(stepKey: string) {
    if (!selectedTaskId) return;
    const response = await fetch(`${API_URL}/admission-workflows/${selectedTaskId}/steps/${stepKey}`, { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status: "done" }) });
    if (response.ok) {
      setWorkflowSteps((await response.json()).steps);
      if (stepKey === "communication") navigate("/area/pessoal/station/analise-gestor");
    }
  }
  async function saveTaskNote() {
    if (!selectedTaskId || !noteDraft.trim()) return;
    const url = editingNoteId ? `${API_URL}/tasks/${selectedTaskId}/notes/${editingNoteId}` : `${API_URL}/tasks/${selectedTaskId}/notes`;
    const response = await fetch(url, { method: editingNoteId ? "PUT" : "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ body: noteDraft }) });
    if (!response.ok) return;
    const note = await response.json();
    setTaskNotes((current) => editingNoteId ? current.map((item) => item.id === note.id ? note : item) : [note, ...current]);
    setNoteDraft(""); setEditingNoteId(null);
  }
  async function removeTaskNote(noteId: number) {
    if (!selectedTaskId || !window.confirm("Excluir esta nota?")) return;
    const response = await fetch(`${API_URL}/tasks/${selectedTaskId}/notes/${noteId}`, { method: "DELETE", headers: authHeaders() });
    if (response.ok) setTaskNotes((current) => current.filter((note) => note.id !== noteId));
  }
  const workflowPanel = <section className="admission-workflow">{[{ key: "conference", label: "Conferência" }, { key: "registration", label: "Cadastro" }, { key: "esocial", label: "eSocial" }, { key: "contracts", label: "Contratos" }, { key: "communication", label: "Comunicação" }].map((step, index) => { const current = workflowSteps.find((item) => item.stepKey === step.key); return <article className={current?.status ?? "locked"} key={step.key}><span>{index + 1}</span><div><strong>{step.label}</strong><small>{current?.status === "done" ? "Concluída" : current?.status === "locked" ? "Aguardando etapa anterior" : current?.status === "waiting_release" ? "Aguardando checklist" : "Liberada"}</small></div>{current?.status === "pending" && <button type="button" onClick={() => void completeWorkflowStep(step.key)}>Concluir</button>}</article>; })}</section>;
  const notesPanel = <aside className="ops-panel admission-notes"><div><h3>Histórico e notas</h3><small>Atualizações automáticas e observações da equipe.</small></div><div className="task-history">{taskHistory.map((event) => <article key={event.id}><span>{new Date(event.occurredAt).toLocaleString("pt-BR")}</span><strong>{event.message}</strong></article>)}{taskHistory.length === 0 && <small>Sem atualizações registradas.</small>}</div><div className="task-note-composer"><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Escreva uma nota..." /><footer><button type="button" onClick={() => { setNoteDraft(""); setEditingNoteId(null); }}>Limpar</button><button type="button" onClick={() => void saveTaskNote()}>{editingNoteId ? "Salvar edição" : "Enviar edição"}</button></footer></div><div className="task-notes-list">{taskNotes.map((note) => <article key={note.id}><p>{note.body}</p><small>{note.author} · {new Date(note.createdAt).toLocaleString("pt-BR")}{note.updatedAt ? " · editada" : ""}</small><span><button type="button" onClick={() => { setNoteDraft(note.body); setEditingNoteId(note.id); }}>Editar</button><button type="button" onClick={() => void removeTaskNote(note.id)}>Excluir</button></span></article>)}{taskNotes.length === 0 && <small>Sem notas registradas.</small>}</div></aside>;

  if (searchParams.get("view") === "manuals") {
    return <AdmissionManualsPage onBack={() => setSearchParams({})} />;
  }

  return (
    <AreaFrame title="Esteira de Admissoes" subtitle="Documentos e dados obrigatorios conforme o checklist de admissao enviado pelo escritorio." icon={<UsersRound />} smallHeader backTo="/area/pessoal" backLabel="Sair">
      <section className="admission-layout">
        <main className="admission-checklist">
          <section className="ops-panel admission-task-queue"><div className="customer-list-header"><div><h3>Fila de admissões</h3><small>Clique em uma solicitação para abrir o checklist. Clique nas colunas para ordenar.</small></div></div><SortableTaskTable tasks={tasks} selectedTaskId={selectedTaskId} onSelectTask={(task) => setSelectedTaskId(task.id)} showAdmissionStage /></section>
          {workflowPanel}
          <section className="ops-panel admission-progress"><div><h3>{selectedTask?.client_name ?? "Selecione uma solicitação"}</h3><small>Andamento do checklist da admissão</small></div><div className="admission-progress-bars"><div><small>{completedRequired} de {totalRequired} itens obrigatórios</small><div className="office-progress-bar"><span style={{ width: `${totalRequired ? completedRequired / totalRequired * 100 : 0}%` }} /></div></div><div className="complementary-bar"><small>{completedComplementary} de {totalComplementary} informações complementares {pendingComplementary ? `· ${pendingComplementary} pendente(s)` : "· concluídas"}</small><div className="office-progress-bar"><span style={{ width: `${totalComplementary ? completedComplementary / totalComplementary * 100 : 0}%` }} /></div></div></div><div className="admission-progress-actions"><strong>{Math.round(totalRequired ? completedRequired / totalRequired * 100 : 0)}%</strong><button className="checklist-toggle" type="button" onClick={() => setChecklistOpen((open) => !open)}>{checklistOpen ? "Recolher checklist" : "Abrir checklist"}</button></div><div className={`admission-release ${canRelease ? "ready" : "blocked"}`}><div><strong>{released ? "Admissão liberada para execução" : canRelease ? "Checklist obrigatório completo" : "Liberação bloqueada"}</strong><span>{canRelease ? pendingComplementary ? `A execução está liberada; ainda há ${pendingComplementary} informação(ões) complementar(es) para completar.` : "Todos os dados obrigatórios e complementares foram informados." : `Faltam ${totalRequired - completedRequired} item(ns) obrigatório(s).`}</span></div><button type="button" disabled={!canRelease || released} onClick={() => { updateRecord((current) => ({ ...current, released: true })); void completeWorkflowStep("conference"); }}><CheckCircle2 size={18} /> Liberar admissão</button></div></section>
          <Link className="admission-help-button" to="?view=manuals" title="Abrir manuais da tarefa" aria-label="Abrir manuais da tarefa"><CircleHelp size={18} /> Manuais</Link>
          {checklistOpen && <><section className="ops-panel admission-documents-panel"><h3>Documentos <span className="required-legend">* Obrigatório</span></h3><div className="admission-document-grid">{requiredDocuments.map(([id, label, required]) => { const file = documents[id]; return <label className={`${!required ? "conditional-inactive" : ""} ${file ? "has-file" : ""}`} key={id}><div><strong>{label}{required && <span className="required-mark">*</span>}</strong>{file && <span>{file.name}</span>}{file && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openDocument(id); }}>{canPreviewDocument(file) ? "Visualizar" : "Baixar arquivo"}</button>}</div><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.odt" disabled={!required} onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) updateDocuments({ ...documents, [id]: selectedFile }); }} /><Upload size={18} /></label>; })}</div><div className="admission-conditions"><label><input type="checkbox" checked={form.reservistRequired} onChange={(event) => updateForm({ ...form, reservistRequired: event.target.checked })} /> Homem entre 18 e 45 anos</label><label><input type="checkbox" checked={form.driver} onChange={(event) => updateForm({ ...form, driver: event.target.checked })} /> Exerce função de motorista</label><label><input type="checkbox" checked={form.childDependent} onChange={(event) => updateForm({ ...form, childDependent: event.target.checked })} /> Possui filhos dependentes</label></div><h4 className="admission-subheading">Documentos complementares <small>Importantes, mas não bloqueiam a liberação</small></h4><div className="admission-document-grid optional">{optionalDocuments.map((label, index) => { const id = `optional-${index}`; const file = documents[id]; return <label key={label}><div><strong>{label}</strong>{file && <span>{file.name}</span>}</div><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.odt" onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) updateDocuments({ ...documents, [id]: selectedFile }); }} /><Upload size={18} /></label>; })}</div></section><section className="ops-panel admission-form"><h3>Informações da contratação <span className="required-legend">* Obrigatório</span></h3><div className="form-grid">{field("admissionDate", "Data de admissão", "date")}{field("employee", "Nome do funcionário")}{field("role", "Cargo")}{field("salary", "Salário")}<section className="schedule-container"><header>Horários</header>{field("startTime", "Início", "time")}{field("endTime", "Fim", "time")}{field("breakStart", "Intervalo início", "time")}{field("breakEnd", "Intervalo fim", "time")}</section>{field("weeklyRest", "Descanso semanal / dia da folga")}{field("phone", "Telefone de contato")}{field("race", "Raça/cor")}<label className="required-field"><span className="field-label">Contrato de experiência<b className="required-mark">*</b></span><select value={form.probation} onChange={(event) => updateForm({ ...form, probation: event.target.value })} required><option value="" disabled>Selecione</option><option value="30 dias">30 dias</option><option value="45 dias">45 dias</option></select></label><label className="required-field"><span className="field-label">Estado civil<b className="required-mark">*</b></span><select value={form.maritalStatus} onChange={(event) => updateForm({ ...form, maritalStatus: event.target.value })} required><option value="" disabled>Selecione</option><option value="Casado">Casado</option><option value="Solteiro">Solteiro</option><option value="Emancipado">Emancipado</option></select></label></div><h4 className="admission-subheading">Informações complementares <small>Importantes, mas não bloqueiam a liberação</small></h4><div className="form-grid">{field("email", "E-mail", "text", false)}{field("education", "Grau de instrução", "text", false)}{field("overtime", "Tratamento das horas extras", "text", false)}{field("transport", "Vale-transporte", "text", false)}{field("healthPlan", "Plano de saúde", "text", false)}<label className="wide">Informações especiais<textarea value={form.specialNotes} onChange={(event) => updateForm({ ...form, specialNotes: event.target.value })} /></label></div></section></>}
        </main>
        {notesPanel}
      </section>
    </AreaFrame>
  );
}

export function AdmissionManualsPage({ onBack }: { onBack?: () => void } = {}) {
  type ManualItem = { id: string; title: string; description: string; fileName: string; contentType: string; baseUrl?: string; uploadedBy?: string };
  const baseManual: ManualItem = { id: "required-documents", title: "Documentação necessária para admissão", description: "Checklist enviado pelo escritório. Para este fluxo, utilize a página 1.", fileName: "manual-admissao.pdf", contentType: "application/pdf", baseUrl: `${API_URL}/manuals/admission-required-documents` };
  const [manuals, setManuals] = useState<ManualItem[]>([baseManual]);
  const [selectedManualId, setSelectedManualId] = useState(baseManual.id);
  const [previewUrl, setPreviewUrl] = useState(baseManual.baseUrl!);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const selectedManual = manuals.find((manual) => manual.id === selectedManualId) ?? manuals[0];

  useEffect(() => {
    fetch(`${API_URL}/station-manuals?station_key=${encodeURIComponent("pessoal:admissoes")}`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : { manuals: [] }).then((body) => setManuals([baseManual, ...(body.manuals ?? []).map((manual: { id: number; title: string; description: string; fileName: string; contentType: string; uploadedBy: string }) => ({ ...manual, id: String(manual.id) }))])).catch(() => setManuals([baseManual]));
  }, []);

  useEffect(() => {
    if (!selectedManual) return;
    if (selectedManual.baseUrl) { setPreviewUrl(selectedManual.baseUrl); return; }
    let objectUrl = "";
    let cancelled = false;
    fetch(`${API_URL}/station-manuals/${selectedManual.id}/file`, { headers: authHeaders() }).then((response) => response.ok ? response.blob() : null).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => setPreviewUrl(""));
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selectedManualId]);

  async function uploadManual(event: React.FormEvent) {
    event.preventDefault();
    if (!uploadTitle.trim() || (!editingManualId && !uploadFile)) { setUploadMessage(editingManualId ? "Informe o título do manual." : "Informe o título e selecione o arquivo."); return; }
    setUploading(true); setUploadMessage("");
    const payload = new FormData();
    payload.append("title", uploadTitle.trim()); payload.append("description", uploadDescription.trim()); if (uploadFile) payload.append("file", uploadFile);
    const endpoint = editingManualId ? `${API_URL}/station-manuals/${editingManualId}` : `${API_URL}/station-manuals?station_key=${encodeURIComponent("pessoal:admissoes")}`;
    const response = await fetch(endpoint, { method: editingManualId ? "PUT" : "POST", headers: authHeaders(), body: payload });
    if (!response.ok) { const body = await response.json().catch(() => null) as { detail?: string } | null; setUploadMessage(body?.detail ?? "Não foi possível anexar o manual."); setUploading(false); return; }
    const saved = await response.json();
    const item: ManualItem = { id: String(saved.id), title: saved.title, description: saved.description, fileName: saved.fileName, contentType: saved.contentType, uploadedBy: saved.uploadedBy };
    setManuals((current) => editingManualId ? current.map((manual) => manual.id === item.id ? item : manual) : [current[0], item, ...current.slice(1)]); setSelectedManualId(item.id); setUploadTitle(""); setUploadDescription(""); setUploadFile(null); setEditingManualId(null); setUploadMessage(editingManualId ? "Manual atualizado com sucesso." : "Manual anexado com sucesso."); setUploading(false);
  }

  function startEditingManual() {
    if (!selectedManual || selectedManual.baseUrl) return;
    setEditingManualId(selectedManual.id); setUploadTitle(selectedManual.title); setUploadDescription(selectedManual.description); setUploadFile(null); setUploadMessage("Você pode manter o arquivo atual ou selecionar outro.");
  }

  function cancelManualEditing() {
    setEditingManualId(null); setUploadTitle(""); setUploadDescription(""); setUploadFile(null); setUploadMessage("");
  }

  async function deleteManual() {
    if (!selectedManual || selectedManual.baseUrl || !window.confirm(`Excluir o manual “${selectedManual.title}”?`)) return;
    const response = await fetch(`${API_URL}/station-manuals/${selectedManual.id}`, { method: "DELETE", headers: authHeaders() });
    if (!response.ok) { setUploadMessage("Não foi possível excluir o manual."); return; }
    setManuals((current) => current.filter((manual) => manual.id !== selectedManual.id)); setSelectedManualId(baseManual.id); cancelManualEditing(); setUploadMessage("Manual excluído.");
  }

  function downloadManual() {
    if (!previewUrl || !selectedManual) return;
    const link = document.createElement("a"); link.href = selectedManual.baseUrl ? `${selectedManual.baseUrl}?download=true` : previewUrl; link.download = selectedManual.fileName; link.click();
  }

  const canPreview = selectedManual?.contentType === "application/pdf" || selectedManual?.contentType.startsWith("image/") || selectedManual?.contentType.startsWith("text/");
  return (
    <AreaFrame title="Manuais de Admissão" subtitle="Arquivos de apoio vinculados a esta esteira de trabalho." icon={<FileText />} smallHeader>
      <div className="manual-page-actions">{onBack ? <button type="button" onClick={onBack}><ArrowLeft size={17} /> Voltar para a admissão</button> : <Link to="/area/pessoal/station/admissoes"><ArrowLeft size={17} /> Voltar para a admissão</Link>}</div>
      <form className="ops-panel manual-upload-form" onSubmit={uploadManual}><div><strong>{editingManualId ? "Editar manual" : "Anexar novo manual"}</strong><small>{editingManualId ? "Altere os dados ou substitua o arquivo atual." : "O arquivo ficará disponível para todos os usuários desta esteira."}</small></div><label>Título<input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Nome do procedimento ou orientação" /></label><label>Descrição<input value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} placeholder="Quando este manual deve ser utilizado" /></label><label className="manual-file-input"><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.txt,image/*" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /><Upload size={17} /> {uploadFile?.name ?? (editingManualId ? "Manter arquivo atual" : "Selecionar arquivo")}</label><div className="manual-form-actions">{editingManualId && <button type="button" onClick={cancelManualEditing}>Cancelar</button>}<button type="submit" disabled={uploading}>{uploading ? "Salvando..." : editingManualId ? "Salvar alterações" : "Anexar manual"}</button></div>{uploadMessage && <span>{uploadMessage}</span>}</form>
      <section className="ops-panel manual-library"><nav>{manuals.map((manual) => <button className={selectedManualId === manual.id ? "active" : ""} type="button" key={manual.id} onClick={() => setSelectedManualId(manual.id)}><FileText size={18} /><span><strong>{manual.title}</strong><small>{manual.description || manual.fileName}</small></span></button>)}</nav><div className="manual-viewer"><div><strong>{selectedManual.title}</strong><span>{!selectedManual.baseUrl && <button type="button" onClick={startEditingManual}>Editar</button>}{!selectedManual.baseUrl && <button className="manual-delete-button" type="button" onClick={() => void deleteManual()}>Excluir</button>}{canPreview && previewUrl && <button type="button" onClick={() => window.open(`${previewUrl}${selectedManual.baseUrl ? "#page=1" : ""}`, "_blank")}>Abrir em outra aba</button>}<button type="button" onClick={downloadManual}>Baixar arquivo</button></span></div>{canPreview ? previewUrl ? <iframe title={selectedManual.title} src={`${previewUrl}${selectedManual.baseUrl ? "#page=1&view=FitH" : ""}`} /> : <div className="manual-preview-message">Carregando manual...</div> : <div className="manual-preview-message"><FileText size={36} /><strong>Este formato deve ser baixado para visualização.</strong><button type="button" onClick={downloadManual}>Baixar {selectedManual.fileName}</button></div>}</div></section>
    </AreaFrame>
  );
}

function ManagerReviewPage() {
  const map = useFilteredOperationMap();
  const [handledTaskIds, setHandledTaskIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const tasks = map.tasks.filter((task) => task.area_id === "pessoal" && task.station_id === "admissoes" && task.status === "manager_review" && !handledTaskIds.includes(task.id));

  async function review(taskId: number, decision: "approve" | "return") {
    setMessage("");
    const response = await fetch(`${API_URL}/admissions/${taskId}/manager-review`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ decision }) });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null;
      setMessage(body?.detail ?? "Não foi possível registrar a análise.");
      return;
    }
    setHandledTaskIds((current) => [...current, taskId]);
    setMessage(decision === "approve" ? "Admissão aprovada e arquivada." : "Admissão devolvida para a etapa Comunicação.");
  }

  return (
    <AreaFrame title="Análise do Gestor" subtitle="Ponto de saída para conferir as admissões entregues antes do arquivamento definitivo." icon={<PackageCheck />} smallHeader backTo="/area/pessoal" backLabel="Sair">
      <section className="ops-panel manager-review-queue"><div className="customer-list-header"><div><h3>Peças aguardando análise</h3><small>{tasks.length} admissão(ões) concluída(s) pela operação e entregue(s) ao cliente.</small></div></div>{message && <p className="personnel-request-message">{message}</p>}<div className="company-table-wrap"><table className="company-table"><thead><tr><th>Código</th><th>Empresa</th><th>Colaborador</th><th>Solicitada em</th><th>Apresentação</th><th>Decisão do gestor</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{task.task_code ?? `T-${String(task.id).padStart(6, "0")}`}</strong></td><td>{task.client_name}</td><td>{task.employee_name ?? "—"}</td><td>{task.requested_at ?? "—"}</td><td><Link to={`/area/pessoal/station/admissoes?task=${task.id}`}>Abrir dossiê</Link></td><td><div className="manager-review-actions"><button type="button" onClick={() => void review(task.id, "return")}>Devolver</button><button type="button" onClick={() => void review(task.id, "approve")}><CheckCircle2 size={16} /> Aprovar e arquivar</button></div></td></tr>)}{tasks.length === 0 && <tr><td colSpan={6} className="empty-state">Nenhuma peça aguardando análise do gestor.</td></tr>}</tbody></table></div></section>
    </AreaFrame>
  );
}

export function WorkstationPage() {
  const { areaId, stationId } = useParams();
  if (areaId === "pessoal" && stationId === "admissoes") return <AdmissionWorkstationPage />;
  if (areaId === "pessoal" && stationId === "analise-gestor") return <ManagerReviewPage />;
  return <StandardWorkstationPage areaId={areaId} stationId={stationId} />;
}

function StandardWorkstationPage({ areaId, stationId }: { areaId?: string; stationId?: string }) {
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
