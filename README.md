# ⚡ marketiv.io (Clientilio)

> **SaaS B2B Multi-tenant de Gestão de Clientes, Campanhas e Portal de Entregáveis para Agências**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 Visão Geral

O **marketiv.io** é uma plataforma SaaS projetada especificamente para **agências de marketing, design, publicidade e tecnologia**. O sistema centraliza o relacionamento com os clientes, o acompanhamento de campanhas em produção, a validação de entregáveis criativos (com versões e solicitações de alteração) e disponibiliza um **Portal do Cliente** intuitivo (com suporte a acesso sem senha via link seguro).

---

## ✨ Principais Funcionalidades

- **🏢 Multi-tenancy Completo:** Cada agência opera isoladamente como uma organização (`organizationId`), com suporte a troca rápida de agências para usuários com múltiplos vínculos.
- **👥 Controle de Acesso Baseado em Papéis (RBAC):**
  - **Proprietário (`OWNER`):** Gestão irrestrita da agência, faturamento, upgrades de plano e equipe.
  - **Administrador (`ADMIN`):** Adiciona, altera e exclui clientes e projetos, gerencia convites e colaboradores.
  - **Membro da Equipe (`MEMBER`):** Focado em execução; colabora em entregáveis e tarefas. **Não tem permissão** para cadastrar, editar ou excluir clientes e projetos.
  - **Cliente (`CLIENT`):** Acesso restrito ao Portal do Cliente para visualizar entregáveis, aprovar etapas e solicitar ajustes.
- **🎨 Portal do Cliente:** Interface dedicada para os clientes da agência aprovarem peças publicitárias, designs e campanhas em tempo real, inclusive via links diretos sem fricção de senha (`/p/:projectId`).
- **📦 Gestão de Entregáveis & Versionamento:** Controle de múltiplos criativos por projeto, histórico de versões (`v1`, `v2`, `v3...`), links externos (Figma, Drive, Loom) e status de aprovação (`Em Revisão`, `Aprovado`, `Alterações Solicitadas`).
- **🛡️ IDs Curtos com Garantia Anti-Colisão:** Identificadores URL-safe em Base64 com prefixo semântico e verificação automática no banco de dados antes da inserção.
- **🔐 Segurança Avançada:**
  - Autenticação JWT com rotação de refresh tokens em cookies HTTP-Only.
  - Autenticação em Duas Etapas (2FA / MFA via TOTP) compatível com Google Authenticator.
  - Validação rigorosa de esquemas de entrada com **Zod**.
  - Proteção de cabeçalhos via **Helmet**, CORS parametrizado e conformidade de cookies (LGPD).
- **💳 Planos & Billing Integrado (Stripe):** Limites configuráveis por plano (clientes ativos, membros da equipe e agências).

---

## 🔐 Matriz de Permissões (RBAC)

| Ação / Recurso | Proprietário (`OWNER`) | Administrador (`ADMIN`) | Membro da Equipe (`MEMBER`) | Cliente (`CLIENT`) |
|---|:---:|:---:|:---:|:---:|
| Visualizar Clientes & Projetos | ✅ | ✅ | ✅ (Apenas Leitura) | ❌ |
| Adicionar / Alterar Clientes | ✅ | ✅ | ❌ Bloqueado | ❌ |
| Excluir / Arquivar Clientes | ✅ | ✅ | ❌ Bloqueado | ❌ |
| Criar / Alterar Campanhas | ✅ | ✅ | ❌ Bloqueado | ❌ |
| Excluir / Arquivar Campanhas | ✅ | ✅ | ❌ Bloqueado | ❌ |
| Criar Entregáveis & Tarefas | ✅ | ✅ | ✅ | ❌ |
| Aprovar / Rejeitar Entregáveis | ✅ | ✅ | ✅ | ✅ (No Portal) |
| Gerenciar Equipe & Convites | ✅ | ✅ | ❌ | ❌ |
| Planos, Assinaturas & Faturamento | ✅ | ❌ | ❌ | ❌ |

---

## 🆔 Padrão de Identificadores (Anti-Colisão)

Para proporcionar URLs limpas e fáceis de compartilhar, o sistema utiliza IDs em Base64 com prefixos semânticos e verificação ativa no banco:

| Entidade | Prefixo | Comprimento | Exemplo | Combinações |
|---|:---:|:---:|---|---|
| **Usuário** | `u` | 7 chars (`u` + 6) | `u7K9mX2` | ~68,7 bilhões |
| **Organização / Agência** | `o` | 7 chars (`o` + 6) | `oAb4Z91` | ~68,7 bilhões |
| **Cliente** | `c` | 7 chars (`c` + 6) | `cM2x9Pq` | ~68,7 bilhões |
| **Projeto / Campanha** | `p` | 9 chars (`p` + 8) | `pNx48Klm2` | ~281,4 trilhões |
| **Entregável** | `d` | 9 chars (`d` + 8) | `dQ92LmKp7` | ~281,4 trilhões |

> **Garantia de Unicidade:** A função `generateUniqueBase64Id` executa checagem prévia no banco (`findUnique`). Caso detecte uma colisão, um novo ID é gerado em tempo de execução até garantir 100% de exclusividade.

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com **TypeScript**
- **Vite** para compilação ultrarrápida
- **Vanilla CSS Tokens** (Inspirado no Design System da Vercel — tipografia Geist, paleta refinada e dark mode)
- **React Router DOM 6**
- **Lucide React** (Ícones modernos)
- **React Hot Toast** (Notificações responsivas)
- **Axios** (Com interceptors para injeção de token e contexto de tenant)

### Backend
- **Node.js** com **Express**
- **TypeScript**
- **Prisma ORM** (Modelagem de dados e migrations estruturadas)
- **PostgreSQL 16** (com suporte de fallback leve ao PGlite)
- **Zod** (Validação de schemas)
- **JWT** (`jsonwebtoken`) + **Bcrypt.js**
- **Stripe SDK** (Cobranças e webhooks)
- **Speakeasy / TOTP** (Autenticação de 2 fatores)

### DevOps & Infraestrutura
- **Docker** & **Docker Compose**
- **NGINX** (Reverse Proxy e Load Balancer com balanceamento round-robin)
- **Railway** (Configuração pronta via `railway.json`)

---

## 📁 Estrutura do Repositório

```text
├── client/                     # Frontend da Aplicação (SPA React + Vite)
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis (Navbar, Sidebar, Modals, Logo, etc.)
│   │   ├── contexts/           # Contextos React (AuthContext, ThemeContext)
│   │   ├── pages/              # Páginas (Dashboard, Clientes, Projetos, Entregáveis, Equipe, Portal)
│   │   ├── services/           # Configuração do Axios e clientes de API
│   │   ├── styles/             # Design system e tokens de estilo global
│   │   └── types/              # Definições TypeScript globais
│   └── vite.config.ts
│
├── server/                     # Backend API (Node.js + Express)
│   ├── prisma/
│   │   ├── schema.prisma       # Definição do banco de dados relacional
│   │   └── seed.ts             # Dados iniciais para ambiente de desenvolvimento
│   ├── src/
│   │   ├── config/             # Configurações de planos e variáveis de ambiente
│   │   ├── lib/                # Bibliotecas utilitárias (auth, errors, id, mfa, prisma)
│   │   ├── middleware/         # Middlewares (auth, RBAC, validação, tenant resolver)
│   │   └── modules/            # Módulos verticais da aplicação
│   │       ├── auth/           # Login, registro, MFA, recuperação de senha
│   │       ├── billing/        # Planos e integração Stripe
│   │       ├── clients/        # Gestão de clientes da agência
│   │       ├── deliverables/   # Tarefas, entregáveis criativos, aprovações
│   │       ├── organizations/  # Agências, convites e gestão de equipe
│   │       ├── portal/         # Endpoints públicos e autenticados do Portal do Cliente
│   │       └── projects/       # Campanhas e escopos
│   └── Dockerfile
│
├── nginx/                      # Configurações do proxy reverso NGINX
├── docker-compose.yml          # Orquestração do cluster (LB + Server + Client + Postgres)
├── package.json                # Scripts globais do monorepo / workspace
└── railway.json                # Configuração para deploy na Railway
```

---

## 🚀 Como Iniciar o Projeto

### Pré-requisitos
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** & **Docker Compose** (Opcional, caso use banco em container)

### 1. Clonar o Repositório
```bash
git clone https://github.com/dzhumsx/clientilio.git
cd clientilio
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` no servidor:
```bash
cp server/.env.example server/.env
```

Crie o arquivo `.env` no cliente:
```bash
cp client/.env.example client/.env
```

*(No servidor, defina chaves secretas para `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` e configure sua `DATABASE_URL`)*.

### 3. Instalar Dependências
Instale as dependências da raiz, servidor e cliente:
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 4. Preparar o Banco de Dados
Gere os tipos do Prisma e aplique o schema:
```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:push
```
*(Opcional) Popule o banco com dados de exemplo:*
```bash
npm --prefix server run prisma:seed
```

### 5. Executar em Desenvolvimento
Inicie o cliente e o servidor simultaneamente a partir da raiz:
```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:3000](http://localhost:3000)

---

## 🐳 Executando com Docker Compose

Você pode subir a infraestrutura completa (NGINX Load Balancer + Cluster Node.js + Frontend + PostgreSQL) com um único comando:

```bash
docker compose up -d
```

Para escalar instâncias do servidor de API:
```bash
docker compose up -d --scale server=2
```

- Aplicação acessível via proxy em: `http://localhost`
- Healthcheck do Load Balancer: `http://localhost/lb-health`

---

## 📜 Scripts Disponíveis

Na raiz do projeto (`package.json`):

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o Frontend e o Backend em paralelo em modo desenvolvimento |
| `npm run build` | Compila o cliente Vite e o servidor TypeScript para produção |
| `npm run start` | Inicializa o servidor compilado (`dist/index.js`) |
| `npm run db:up` | Sobe o container PostgreSQL via Docker |
| `npm run db:down` | Encerra os containers do Docker |
| `npm run db:push` | Sincroniza o schema do Prisma com o banco de dados |
| `npm run db:studio`| Abre a interface visual do Prisma Studio para inspecionar os dados |
| `npm run docker:up`| Constrói e inicializa todo o ecossistema no Docker |

---

## 📄 Licença

Distribuído sob a licença **ISC**. Consulte o arquivo de licença para mais detalhes.
