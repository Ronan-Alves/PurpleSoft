import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell";

export default function PlaceholderPage({ title }: { title: string }) {
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

