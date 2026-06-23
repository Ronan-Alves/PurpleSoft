# PurpleSoft

MVP de uma linha de producao operacional para BPO. A ideia e trocar menus rigidos por uma planta visual clicavel, onde cada area do fluxo vira uma estacao de trabalho.

## Stack

- Frontend: React 19, TypeScript, Vite, React Router e lucide-react.
- Backend: FastAPI, SQLAlchemy e Postgres.
- Infra local: Docker Compose com containers separados para frontend, backend e banco.

## Rodando

```bash
docker compose up --build
```

- Frontend: http://localhost:5178
- Backend: http://localhost:8088
- Docs da API: http://localhost:8088/docs
- Postgres: localhost:5438

O login aceita qualquer email e senha no MVP. Se a API ainda estiver subindo, o frontend usa dados locais de demonstracao para manter a experiencia navegavel.

Guia completo de operacao, banco e comandos: [docs/GUIA_DO_SISTEMA.md](docs/GUIA_DO_SISTEMA.md)

## O que ja existe

- Tela de login.
- Dashboard em estilo linha industrial com esteiras animadas.
- Estacoes clicaveis para entrada, cadastro, financeiro, triagem, contabil, pessoal, consolidacao e entrega final.
- Navegacao com voltar/avancar via browser.
- Telas reservadas por area para ferramentas, manuais, filas e indicadores.
- Seed inicial no Postgres para o mapa operacional.

## Proximos passos naturais

- Modelar multi-tenant: BPO, escritorios, clientes e usuarios.
- Criar motor de fluxo com regras de avancar, voltar, bloquear e reabrir tarefas.
- Adicionar permissoes por papel e departamento.
- Evoluir a planta visual para canvas/WebGL quando as animacoes ficarem mais ricas.
