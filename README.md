# ProfIA

Micro-SaaS que transforma áudio de aulas + slides em material didático estruturado, publicado automaticamente no Google Classroom.

## Stack

- **Frontend/Backend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Banco de dados:** Supabase (PostgreSQL + Storage + Auth)
- **Auth:** NextAuth.js v5 com Google OAuth 2.0
- **IA:** OpenAI Whisper (transcrição) + Anthropic Claude (geração de conteúdo)
- **Integração:** Google Classroom API v1
- **Pagamentos:** Stripe (subscriptions + créditos avulsos)
- **Deploy:** Vercel

## Configuração local

### 1. Clone e instale

```bash
git clone https://github.com/mychaelparanhos/profiai.git
cd profiai
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as variáveis conforme documentado em `.env.example`.
Veja `PENDENCIAS.md` para itens ainda pendentes de configuração.

### 3. Inicie o servidor

```bash
npm run dev
# Disponível em http://localhost:8080
```

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção (porta 8080) |
| `npm run lint` | Verificação de estilo (ESLint) |
| `npm run typecheck` | Verificação de tipos (TypeScript) |

## Estrutura do projeto

```
profiai/
├── app/
│   ├── (auth)/           # Login e autenticação
│   ├── (dashboard)/      # Área autenticada
│   │   ├── dashboard/    # Painel principal
│   │   ├── aula/         # Criar/visualizar aulas
│   │   ├── turmas/       # Gerenciar turmas do Classroom
│   │   └── planos/       # Planos e créditos
│   └── api/              # API Routes
│       ├── auth/         # NextAuth.js
│       ├── aula/         # Endpoints de aula
│       └── webhooks/     # Stripe webhooks
├── components/           # Componentes React
├── lib/                  # Utilitários e clientes
├── types/                # Tipos TypeScript
└── middleware.ts         # Proteção de rotas
```

## Pendências

Consulte [PENDENCIAS.md](./PENDENCIAS.md) para ver os itens ainda necessários antes de cada sprint, incluindo:

- OpenAI API Key (necessária antes do Sprint 2)
- Stripe (necessário antes do Sprint 4)
- Domínio profiai.com (necessário antes do Sprint 5)

## Documentação

A documentação completa do projeto está em `squads/profiai/` no repositório AIOS:

- PRD: `squads/profiai/docs/prd/profiai-prd.md`
- Arquitetura: `squads/profiai/docs/architecture/fullstack-architecture.md`
- Stories: `squads/profiai/docs/stories/`
