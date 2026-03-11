# ProfIA — Pendências e Itens Diferidos

**Última atualização:** 2026-03-11
**Responsável por resolver:** Mychael Paranhos

---

## 🔴 Crítico — Necessário antes do Sprint 2

### OpenAI API Key (Whisper)
- **O que é:** Chave de API da OpenAI para usar o Whisper (`whisper-1`) na transcrição de áudio
- **Onde usar:** `OPENAI_API_KEY` no `.env.local`
- **Como obter:** [platform.openai.com](https://platform.openai.com) → API Keys → Create new secret key
- **Impacto se não tiver:** Pipeline de IA (Sprint 2/Epic 3) não funcionará

---

## 🟡 Importante — Necessário antes do Sprint 4

### Stripe — Configuração de Produtos e Webhooks
- **O que é:** Conta Stripe com os planos e preços criados
- **Planos a criar no Stripe Dashboard:**
  - Starter: R$ 47/mês → 10 créditos
  - Pro: R$ 97/mês → 30 créditos
  - Heavy: R$ 167/mês → 60 créditos
  - Power: R$ 297/mês → 120 créditos
  - Crédito avulso: R$ 4,90/unidade
- **Variáveis necessárias:**
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  ```

---

## 🟡 Importante — Necessário antes do Sprint 5 (Launch)

### Domínio profiai.com
- **Ação:** Registrar domínio + configurar DNS no Vercel

### Google OAuth — Verificação do App
- **⚠️ Iniciar no Sprint 4** — processo pode levar 1-4 semanas
- Submeter app para revisão: Google Cloud Console → OAuth consent screen → "Publish App"
- Sem verificação: apenas 100 usuários de teste conseguem fazer login

### Google Classroom API — Redirect URI de Produção
- Quando domínio estiver configurado, adicionar no Google Cloud Console:
  - `https://profiai.com/api/auth/callback/google`

### Email Transacional — Resend
- **Como obter:** [resend.com](https://resend.com) → criar conta → obter API key
- **Variável:** `RESEND_API_KEY=re_...`

---

## 🟢 Baixa prioridade — Fase 2

- Sentry para error tracking detalhado
- PostHog para analytics de produto

---

## ✅ Já Resolvido

| Item | Status | Detalhe |
|------|--------|---------|
| Conta Supabase | ✅ | Usar conta existente, criar projeto "profiai" |
| Conta Vercel | ✅ | Usar conta existente, criar projeto "profiai" |
| Google OAuth Credentials | ✅ | Client ID e Secret obtidos |
| NextAuth Secret | ✅ | Gerado e disponível |
| Google Cloud Console — projeto | ✅ | Projeto "ProfIA" criado |
| Google Classroom API | ✅ | Habilitada no projeto |
| Redirect URIs (dev + prod) | ✅ | localhost:8080 e profiai.com configurados |
| Anthropic API Key | ✅ | Usar chave existente |
| Repositório GitHub | ✅ | github.com/mychaelparanhos/profiai criado |
| Scaffold Next.js 14 | ✅ | App Router + TypeScript + Tailwind |

---

*Documento mantido pelo @devops e atualizado a cada sprint.*
