# Guia do Sistema PurpleSoft

Este arquivo resume as informacoes importantes para rodar, acessar e entender o MVP do PurpleSoft.

## Visao Geral

O PurpleSoft e um MVP para transformar a operacao de um BPO em uma linha de producao visual. A tela principal mostra uma esteira com estacoes clicaveis. Cada estacao abre uma tela propria para receber, no futuro, tarefas, ferramentas, manuais, indicadores e controles do departamento.

Estrutura principal:

- `frontend/`: aplicacao React com a tela visual.
- `backend/`: API FastAPI.
- `postgres`: banco de dados criado pelo Docker Compose.
- `docker-compose.yml`: sobe frontend, backend e banco juntos.

## Tecnologias

- Frontend: React, TypeScript, Vite, React Router e lucide-react.
- Backend: FastAPI, SQLAlchemy e Pydantic.
- Banco: PostgreSQL 16.
- Migrations: Alembic.
- Containers: Docker Compose.

## Como Rodar Com Docker

Na raiz do projeto:

```bash
cd /Users/ronanalves/PlusTech/PurpleBPO/PurpleSoft
docker compose up --build
```

O container do backend executa as migrations automaticamente com:

```bash
alembic upgrade head
```

Depois de subir:

- Frontend: `http://localhost:5178`
- Backend: `http://localhost:8088`
- Documentacao da API: `http://localhost:8088/docs`
- Health check da API: `http://localhost:8088/health`
- Postgres local: `localhost:5438`

Para parar:

```bash
docker compose down
```

Para parar e apagar os dados do banco local:

```bash
docker compose down -v
```

## Como Rodar Sem Docker

### Frontend

```bash
cd /Users/ronanalves/PlusTech/PurpleBPO/PurpleSoft/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5178
```

### Backend

Crie e ative um ambiente Python:

```bash
cd /Users/ronanalves/PlusTech/PurpleBPO/PurpleSoft/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Sem Docker, o backend espera o Postgres em:

```text
postgresql+psycopg://purplesoft:purplesoft@localhost:5438/purplesoft
```

## Login do MVP

No MVP, o login aceita qualquer email e senha. O frontend ja vem preenchido com:

- Email: `gerente@purplebpo.com.br`
- Senha: `purple123`

Isso e temporario. A autenticacao real deve ser implementada quando criarmos usuarios, papeis e permissoes.

## Navegacao da Planta Industrial

Na tela principal:

- clique em uma estacao para abrir a tela especifica daquele ponto do processo;
- clique e arraste a area da industria para mover a planta;
- recolha o menu esquerdo para liberar espaco horizontal;
- recolha o painel direito para ver a planta com mais area util.

A planta foi preparada como uma area maior que a tela visivel. Isso permite incluir novas esteiras, setores e ramificacoes sem depender de um menu fixo.

## Fluxo Operacional do MVP

O MVP agora usa um cenario ficticio salvo no `localStorage` do navegador. A estrutura principal e:

- Escritorio: quem atende o cliente final.
- Cliente: empresa com razao social e CNPJ.
- Demanda: pedido recebido do escritorio para um cliente.
- Tarefa: fragmento operacional criado pela triagem.
- Departamento: agrupamento de esteiras internas, como Contabil e Departamento Pessoal.
- Estacao de trabalho: uma esteira interna do departamento, como Conciliacao Bancaria, Receitas, Folha ou Ferias.
- Procedimento operacional: instrucao da estacao.

Fluxo esperado:

1. Entrada da Demanda cria a demanda e envia para Triagem.
2. Cadastro permite cadastrar escritorio e cliente.
3. Financeiro registra liberacao ou pendencia financeira da demanda.
4. Triagem seleciona a demanda, define prioridade, funcionario e quais tarefas serao criadas.
5. As tarefas sao distribuidas para as esteiras internas dos departamentos.
6. No departamento, cada estacao mostra sua fila e seu procedimento operacional.
7. Ao entrar na estacao, o tempo da estacao comeca a contar.
8. Ao iniciar uma tarefa, o tempo da tarefa tambem comeca a contar.
9. Ao concluir uma tarefa, o sistema pergunta se deve seguir para a proxima tarefa da mesma estacao ou para a proxima tarefa da mesma demanda.
10. Na Entrega Final, a demanda mostra quantas tarefas existiam e quantas foram concluidas.

Para reiniciar o cenario ficticio do navegador:

```js
localStorage.removeItem("purplesoft_operation_state_v1")
```

Depois recarregue a pagina.

## Banco Postgres

O banco e criado pelo servico `postgres` no `docker-compose.yml`.

Credenciais:

- Host local: `localhost`
- Porta local: `5438`
- Database: `purplesoft`
- Usuario: `purplesoft`
- Senha: `purplesoft`
- Host dentro do Docker: `postgres`
- Porta dentro do Docker: `5432`

String de conexao para ferramentas como DBeaver, TablePlus ou DataGrip:

```text
postgresql://purplesoft:purplesoft@localhost:5438/purplesoft
```

String usada pelo backend dentro do Docker:

```text
postgresql+psycopg://purplesoft:purplesoft@postgres:5432/purplesoft
```

## Como Conectar Pelo DBeaver

Com o Docker rodando, crie uma nova conexao PostgreSQL no DBeaver usando:

```text
Host: localhost
Porta: 5438
Database: purplesoft
Usuario: purplesoft
Senha: purplesoft
```

URL JDBC equivalente:

```text
jdbc:postgresql://localhost:5438/purplesoft
```

Passos no DBeaver:

1. Clique em `Nova conexao`.
2. Escolha `PostgreSQL`.
3. Preencha `Host`, `Port`, `Database`, `Username` e `Password` com os dados acima.
4. Clique em `Test Connection`.
5. Se o DBeaver pedir para baixar o driver PostgreSQL, aceite.

Se nao conectar, confirme que o container do banco esta rodando:

```bash
docker compose ps
```

O servico `postgres` deve aparecer como `healthy`.

## Migrations Do Banco

As migrations ficam em:

```text
backend/migrations
```

Arquivo principal:

```text
backend/migrations/versions/20260623_0001_initial_schema.py
```

Para aplicar migrations com Docker:

```bash
docker compose run --rm backend alembic upgrade head
```

Para ver a migration atual:

```bash
docker compose run --rm backend alembic current
```

Para criar uma nova migration depois de alterar modelos:

```bash
cd /Users/ronanalves/PlusTech/PurpleBPO/PurpleSoft/backend
alembic revision --autogenerate -m "descricao da mudanca"
```

Depois revise o arquivo gerado em `backend/migrations/versions/` antes de aplicar.

## Como Conectar no Banco Pelo Terminal

Com o Docker rodando, pela propria stack:

```bash
docker compose exec postgres psql -U purplesoft -d purplesoft
```

Se voce tiver `psql` instalado na maquina:

```bash
psql postgresql://purplesoft:purplesoft@localhost:5438/purplesoft
```

Comandos uteis dentro do `psql`:

```sql
\dt
select * from work_areas;
select * from tasks;
select * from alembic_version;
\q
```

## Tabelas Criadas no MVP

### `offices`

Guarda escritorios atendidos pelo BPO.

### `customers`

Guarda o cadastro basico do cliente para contrato.

Campos importantes:

- `office_id`: escritorio associado.
- `legal_name`: razao social.
- `cnpj`: CNPJ.
- `trade_name`: nome fantasia.
- `contract_address`: endereco para contrato.
- `contract_city_state`: cidade/UF.
- `contract_email`: email usado para contrato.
- `other_service_description`: descricao quando houver interesse em outro servico.

### `customer_contacts`

Guarda contatos do cliente.

Campos importantes:

- `customer_id`: cliente associado.
- `name`: nome do contato.
- `role`: quem a pessoa e na empresa.
- `phone`: telefone.
- `email`: email.

### `customer_service_interests`

Guarda os interesses base do cliente:

- `contabil`
- `pessoal`
- `outro`

### `work_areas`

Guarda as estacoes/departamentos da linha visual.

Campos importantes:

- `id`: identificador usado na rota e no frontend.
- `name`: nome da area.
- `kind`: tipo visual da area, como `station`, `department`, `delivery`.
- `status`: estado visual, como `available`, `running`, `attention`, `done`.
- `position_x` e `position_y`: posicao percentual no mapa.
- `wip`: quantidade em fila.
- `pending`: pendencias.
- `priority`: nivel de prioridade/alerta.

### `tasks`

Guarda tarefas de demonstracao ligadas a uma area.

Campos importantes:

- `title`: nome da tarefa.
- `client_name`: cliente/escritorio associado.
- `status`: estado da tarefa.
- `area_id`: area atual da tarefa.

### `demands`

Guarda demandas recebidas para clientes.

### `procedures`

Guarda procedimentos operacionais por estacao.

### `station_times`

Guarda tempo acumulado por estacao de trabalho.

## Seed Inicial

O arquivo `backend/app/seed.py` cria dados iniciais na primeira subida do backend. Ele so insere dados se a tabela `work_areas` estiver vazia.

Se mudar o seed e quiser recriar tudo localmente:

```bash
docker compose down -v
docker compose up --build
```

## Endpoints Principais

- `GET /health`: verifica se a API esta online.
- `POST /auth/login`: login temporario do MVP.
- `GET /operation-map`: retorna areas, tarefas e resumo da operacao para o dashboard.

## Arquivos Mais Importantes

- `frontend/src/main.tsx`: rotas, login, dashboard e telas clicaveis.
- `frontend/src/styles.css`: visual industrial, esteiras, departamentos e responsividade.
- `backend/app/main.py`: rotas da API.
- `backend/app/models.py`: modelos do banco.
- `backend/app/seed.py`: dados iniciais.
- `docker-compose.yml`: containers, portas e variaveis.

## Observacoes Para Evolucao

O proximo bloco importante do sistema deve ser o motor de fluxo:

- criar tipos de tarefa;
- definir regras de avanco e retorno;
- registrar responsavel e SLA;
- separar BPO, escritorio e cliente;
- controlar permissoes por papel;
- gravar historico de cada movimento na esteira.
