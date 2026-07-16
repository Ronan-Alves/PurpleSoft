import { useState } from "react";
import { Factory, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL, operatorTokenKey } from "../app/shared";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("gerente@purplebpo.com.br");
  const [password, setPassword] = useState("");
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
      if (!response.ok) throw new Error("Login ou senha invalidos.");
      const body = await response.json();
      localStorage.setItem(operatorTokenKey, body.access_token);
      localStorage.setItem("purplesoft_user", body.name);
      navigate("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login ou senha invalidos.");
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
