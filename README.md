# 🚀 Nexora — Portal de Clientes para Agências Digitais

Plataforma SaaS multi-tenant desenvolvida para agências digitais, estúdios de design e produtoras gerenciarem clientes, projetos, entregáveis com versionamento e fluxos de aprovação formal com um clique.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com **TypeScript** e **Vite**
- **Design System Customizado:** Tokens CSS modernos, paleta Midnight & Electric Iris, glassmorphism e micro-animações
- **React Router v7** para rotas públicas, painel autenticado e portal dedicado do cliente
- **Lucide Icons** para iconografia consistente

### Backend
- **Node.js** com **Express** e **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **Segurança:**
  - Hashes de senha com **bcryptjs** (salt rounds: 12)
  - Autenticação stateless via **JWT** (Access Token de curta duração + Refresh Token com rotação contínua)
  - Isolamento rigoroso multi-tenant no nível do middleware (`x-organization-id` + RBAC)
  - Proteção de cabeçalhos HTTP com **Helmet** e CORS configurável
  - **Rate Limiting** global e restrito para rotas de autenticação (mitigação de brute-force)
- **Faturamento & Gateway:**
  - Módulo **Stripe** preparado para assinaturas mensais em Reais (BRL)
  - Modo simulação automático para testes locais e deploys sem chaves imediatas
  - Catálogo de 4 planos: **Free** (R$ 0), **Pro** (R$ 59), **Business** (R$ 119) e **Agency** (R$ 239)
- **Armazenamento de Arquivos:**
  - Upload via **Multer** para volume em disco (`./uploads`) com controle de tenancy e permissões

---

## 📁 Estrutura do Projeto

```
/
├── client/                      # Frontend em React + Vite + TS
│   ├── src/
│   │   ├── components/          # Navbar, Sidebar, Modal, StatusBadge, Layouts
│   │   ├── contexts/            # AuthContext (login, register, org selector)
│   │   ├── pages/               # LandingPage, Login, Register, Dashboard, Clientes, Projetos, Entregáveis, Billing, Portal do Cliente
│   │   ├── services/            # Cliente Axios com auto-refresh de JWT
│   │   ├── types/               # Tipos TypeScript
│   │   ├── index.css            # Design System (tokens, cores, componentes)
│   │   ├── App.tsx              # Definição de rotas
│   │   └── main.tsx             # Entrypoint
│   └── vite.config.ts
├── server/                      # Backend Node.js + Express + Prisma
│   ├── src/
│   │   ├── config/              # Variáveis de ambiente validadas com Zod e planos
│   │   ├── lib/                 # Utilitários de Auth (bcrypt, JWT), erros customizados e Prisma
│   │   ├── middleware/          # Autenticação JWT, Tenant Resolver e RBAC
│   │   ├── modules/
│   │   │   ├── auth/            # Login, Registro, Refresh, Perfil
│   │   │   ├── organizations/   # Criação de agências, convites, membros
│   │   │   ├── clients/         # CRUD de clientes com arquivamento
│   │   │   ├── projects/        # CRUD de projetos, prazos e orçamentos
│   │   │   ├── deliverables/    # Entregáveis, versões e aprovações
│   │   │   ├── files/           # Upload seguro com checagem de isolamento
│   │   │   └── billing/         # Assinaturas Stripe e simulação de checkout
│   │   ├── app.ts               # Configuração Express + Serving estático em produção
│   │   └── index.ts             # Boot do servidor
│   └── prisma/
│       └── schema.prisma        # Schema completo com todas as entidades
├── railway.json                 # Configuração de build e deploy no Railway
├── Procfile                     # Processo web
├── package.json                 # Orquestração do monorepo
└── README.md
```

---

## 💻 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL rodando localmente ou conexão com banco na nuvem

### 2. Configurar Variáveis de Ambiente
Copie o exemplo no servidor:
```bash
cd server
cp .env.example .env
```
Edite o arquivo `server/.env` com sua string de conexão:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexora_db?schema=public
JWT_ACCESS_SECRET=sua_chave_jwt_super_secreta_com_mais_de_32_caracteres_12345
JWT_REFRESH_SECRET=sua_outra_chave_jwt_super_secreta_com_mais_de_32_caracteres_67890
```

### 3. Gerar Prisma e Migrar Banco
```bash
cd server
npm run prisma:generate
npx prisma db push
```

### 4. Iniciar em Desenvolvimento

**Backend:**
```bash
cd server
npm run dev
# Servidor rodando em http://localhost:3000
```

**Frontend:**
```bash
cd client
npm run dev
# Vite rodando em http://localhost:5173
```

---

## 🚂 Deploy no Railway (Passo a Passo)

O projeto foi estruturado para ser implantado no **Railway** em poucos cliques:

1. Acesse [railway.app](https://railway.app) e crie um novo projeto.
2. Adicione um **PostgreSQL** ao projeto no Railway.
3. Conecte este repositório do GitHub.
4. Nas **Variables** do serviço na Railway, adicione:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (link automático com o banco)
   - `JWT_ACCESS_SECRET`: string segura aleatória de 32+ caracteres
   - `JWT_REFRESH_SECRET`: string segura aleatória de 32+ caracteres
   - `NODE_ENV`: `production`
   - `STRIPE_SECRET_KEY`: *(opcional para pagamentos reais)*
   - `STRIPE_WEBHOOK_SECRET`: *(opcional para webhooks reais)*
5. O Railway detectará o `railway.json` e executará `npm run build`, iniciando o serviço e verificando a saúde em `/health`.
6. Em produção, o backend Express serve automaticamente o bundle do frontend compilado (`client/dist`).

---

## 💳 Gateway de Pagamentos (Stripe)

- O sistema inclui suporte completo para o gateway Stripe para cobrança de assinaturas recorrentes em Reais (BRL).
- **Modo Sandbox / Simulação:** Caso `STRIPE_SECRET_KEY` não seja fornecida nas variáveis de ambiente, o sistema opera automaticamente em modo de simulação no frontend e backend, permitindo testar upgrades de planos, validação de limites e downgrade sem custos ou impedimentos.
