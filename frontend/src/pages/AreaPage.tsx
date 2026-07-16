import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Boxes, Building2, CheckCircle2, CircleHelp, ClipboardList, FileText, GitBranch, PackageCheck, Play, PlayCircle, Plus, Save, Timer, UsersRound, WalletCards } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Shell from "../components/Shell";
import { API_URL, authHeaders, clientSessionKey, customerName, demandProgress, departmentCatalog, employees, formatDuration, officeName, taskTemplates, uniqueId, useOperationMap, useOperationState } from "../app/shared";
import type { ClientAccess, ClientPending, Customer, CustomerBasicRegistrationResponse, CustomerContact, Demand, OperationState, OperationTask, Priority, ServiceInterest, TaskStatus } from "../app/shared";

export default function AreaPage() {
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
  const navigate = useNavigate();
  const [lastAccess, setLastAccess] = useState<ClientAccess | null>(null);
  const [saveError, setSaveError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
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
  const [contacts, setContacts] = useState<CustomerContact[]>([emptyContact()]);

  function startNewCustomer() {
    setSelectedCustomerId("");
    setLastAccess(null);
    setForm(emptyForm);
    setContacts([emptyContact()]);
  }

  function editCustomer(customer: Customer) {
    setSelectedCustomerId(customer.id);
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
    setContacts(customer.contacts && customer.contacts.length > 0 ? customer.contacts : [emptyContact()]);
  }

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
    setContacts((current) => [...current, { id: uniqueId("contact"), name: "", role: "", phone: "", email: "" }]);
  }

  function removeContact(contactId: string) {
    setContacts((current) => current.length === 1 ? current : current.filter((contact) => contact.id !== contactId));
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
    } catch (error) {
      console.error(error);
      setSaveError("Nao foi possivel salvar no banco. Confirme seu login operacional e tente novamente.");
    }
  }

  return (
    <AreaFrame title="Cadastro Basico" subtitle="Registra os dados do cliente para contrato, contatos principais e interesse inicial de servicos." icon={<Building2 />}>
      <section className="ops-grid">
        <form className="ops-panel form-grid" onSubmit={submit}>
          <div className="wide registration-form-header">
            <h3>{selectedCustomerId ? "Editar cadastro" : "Novo cadastro"}</h3>
            <button className="secondary-button" type="button" onClick={startNewCustomer}><Plus size={18} /> Novo cadastro</button>
          </div>
          <label>Escritorio<input value={form.officeName} onChange={(event) => setForm({ ...form, officeName: event.target.value })} /></label>
          <label>Razao social<input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label>
          <label>Nome fantasia<input value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} /></label>
          <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
          <label className="wide">Endereco para contrato<input value={form.contractAddress} onChange={(event) => setForm({ ...form, contractAddress: event.target.value })} /></label>
          <label>Cidade/UF<input value={form.contractCityState} onChange={(event) => setForm({ ...form, contractCityState: event.target.value })} /></label>
          <label>Email para contrato<input value={form.contractEmail} onChange={(event) => setForm({ ...form, contractEmail: event.target.value })} /></label>

          <h3 className="wide">Contatos</h3>
          <div className="wide contact-list">
            {contacts.map((contact, index) => (
              <article className="contact-editor" key={contact.id}>
                <strong>Contato {index + 1}</strong>
                <label>Nome<input value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} /></label>
                <label>Quem e na empresa<input value={contact.role} onChange={(event) => updateContact(contact.id, "role", event.target.value)} /></label>
                <label>Telefone<input value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} /></label>
                <label>Email<input value={contact.email} onChange={(event) => updateContact(contact.id, "email", event.target.value)} /></label>
                {contacts.length > 1 && <button className="secondary-button" type="button" onClick={() => removeContact(contact.id)}>Remover contato</button>}
              </article>
            ))}
          </div>
          <button className="secondary-button" type="button" onClick={addContact}><Plus size={18} /> Adicionar contato</button>

          <h3 className="wide">Situacao base</h3>
          <div className="wide checklist service-checklist">
            {[
              ["contabil", "Interesse em servico contabil"],
              ["pessoal", "Interesse em departamento pessoal"],
              ["outro", "Interesse em outro servico"]
            ].map(([interest, label]) => (
              <label key={interest}>
                <input type="checkbox" checked={form.serviceInterests.includes(interest as ServiceInterest)} onChange={() => toggleServiceInterest(interest as ServiceInterest)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {form.serviceInterests.includes("outro") && (
            <label className="wide">Qual outro servico?<input value={form.otherServiceDescription} onChange={(event) => setForm({ ...form, otherServiceDescription: event.target.value })} /></label>
          )}

          <button type="submit"><Save size={18} /> {selectedCustomerId ? "Salvar alteracoes" : "Salvar cadastro basico"}</button>
          {saveError && <span className="form-error wide">{saveError}</span>}
        </form>
        <section className="ops-panel">
          <div className="customer-list-header">
            <h3>Clientes cadastrados</h3>
          </div>
          {lastAccess && (
            <article className="client-access-card">
              <strong>Acesso do cliente criado</strong>
              <span>Login: {lastAccess.email}</span>
              {lastAccess.password ? <span>Senha temporaria: {lastAccess.password}</span> : <span>Senha ja criada anteriormente.</span>}
              <small>Encaminhe estes dados para o cliente acessar /cliente/login.</small>
            </article>
          )}
          <div className="table-list">
            {state.customers.map((customer) => (
              <article
                className={`customer-list-item ${selectedCustomerId === customer.id ? "active" : ""}`}
                key={customer.id}
                onClick={() => editCustomer(customer)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    editCustomer(customer);
                  }
                }}
              >
                {(() => {
                  const access = state.clientAccesses.find((item) => item.customerId === customer.id);
                  const pending = state.clientPendings.find((item) => item.customerId === customer.id && item.status !== "enviada");
                  const pendingCount = state.clientPendings.filter((item) => item.customerId === customer.id && item.status !== "enviada").length;
                  return (
                    <>
                      <strong>{customer.legalName}</strong>
                      <span>{customer.tradeName ? `${customer.tradeName} · ` : ""}{customer.cnpj}</span>
                      <small>{officeName(state, customer.officeId)}</small>
                      <small>Interesses: {(customer.serviceInterests ?? []).join(", ") || "nao definidos"}</small>
                      <small>Contatos: {(customer.contacts ?? []).length || 0}</small>
                      {access && <small>Portal: {access.email}{access.password ? ` · senha temporaria ${access.password}` : ""}</small>}
                      {pendingCount > 0 && <small>Pendencias do cliente: {pendingCount}</small>}
                      {pending && (
                        <div className="customer-card-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              fillClientPending(customer, pending);
                            }}
                          >
                            <FileText size={16} /> Preencher pendencia
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
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

export function WorkstationPage() {
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
