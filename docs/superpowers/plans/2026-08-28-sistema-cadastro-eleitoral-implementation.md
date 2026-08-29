# Implementation Plan: Sistema de Cadastro Eleitoral

**Goal:** Desenvolver um sistema para campanhas eleitorais cadastrarem eleitores por links individuais de líderes, com dois perfis internos (Administrador e Líder), isolamento de dados, cadastro público, validação robusta, proteção contra abuso e exportação CSV.

**Architecture:** Next.js App Router com server actions, Better Auth para autenticação, Resend para e-mails, PostgreSQL (Neon) via Drizzle ORM e node-postgres (pg.Pool).

**Tech Stack:** Next.js 15.5.24+, React 19, TypeScript, Tailwind CSS, shadcn/ui, Better Auth 1.6.22+, Drizzle ORM 0.45.2+, PostgreSQL (Neon), Resend SDK, Vitest, Playwright.

**Global Constraints:**
- Remover dependências SaaS sem uso (Polar, OpenAI, Uploadthing, PostHog).
- Atualizar dependências vulneráveis (Next.js, Better Auth, Drizzle ORM).
- Habilitar `reactStrictMode` e remover `typescript.ignoreBuildErrors`.
- `db/schema.ts` será a única fonte do esquema; `auth-schema.ts` será removido.
- Usar `drizzle-orm/node-postgres` com `pg.Pool` e URL pooled do Neon.
- CI executará lint, TypeScript, unitários, integração PostgreSQL, E2E, build e auditoria de dependências.
- `npm audit --omit=dev` não poderá apresentar vulnerabilidades altas ou críticas.
- Interface em Português do Brasil (`pt-BR`), fuso horário `America/Sao_Paulo`.

---

## Task 1: Configuração do Ambiente e Limpeza do Starter
**Arquivos:** `package.json`, `next.config.ts`, `db/schema.ts`, `db/drizzle.ts`, `lib/auth.ts`, `.env.example`, `README.md`.
**Interfaces:** Nenhuma interface nova; remoção de módulos SaaS.
**Teste RED:** Verificar que o projeto compila sem erros TypeScript e que as dependências removidas não estão presentes.
**Implementação GREEN:** Remover dependências SaaS, atualizar Next.js, Better Auth e Drizzle ORM, habilitar `reactStrictMode`, remover `ignoreBuildErrors`, substituir `neon-http` por `node-postgres`.
**Refactor:** Limpar imports e configurações não utilizadas.
**Comando de verificação:** `npm run lint && npm run typecheck && npm run build`
**Criterio de aceite:** Projeto compila sem erros, dependências atualizadas, SaaS removidas.

## Task 2: Schema do Banco de Dados e Migração Inicial
**Arquivos:** `db/schema.ts`, `db/drizzle.ts`, `package.json` (drizzle-kit), `drizzle.config.ts`.
**Interfaces:** Tabelas `user`, `session`, `account`, `verification`, `campaign`, `campaign_leader`, `voter`, `invitation`, `registration_rate_limit`, `audit_event`. Remover `auth-schema.ts` se existir.
**Teste RED:** Criar teste de integração que verifica a criação das tabelas e a extensão `citext`.
**Implementação GREEN:** Definir schema completo no `db/schema.ts`, configurar drizzle-kit, gerar migração inicial com `CREATE EXTENSION IF NOT EXISTS citext`.
**Refactor:** Garantir que o esquema esteja em conformidade com o SDD (índices, constraints, tipos).
**Comando de verificação:** `npx drizzle-kit generate && npx drizzle-kit migrate`
**Criterio de aceite:** Migração criada e executada com sucesso, schema completo.

## Task 3: Configuração do Better Auth com Plugin Admin
**Arquivos:** `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`.
**Interfaces:** Configuração do Better Auth com plugin Admin, e-mail/senha habilitado, `disableSignUp: true`, `revokeSessionsOnPasswordReset: true`.
**Teste RED:** Testar que o endpoint `/api/auth/sign-up/email` retorna erro 404 ou 405, e que os endpoints HTTP `/api/auth/admin/*` não existem.
**Implementação GREEN:** Configurar Better Auth com plugin Admin, desabilitar signup público, configurar rate limit com PostgreSQL, ajustar callbacks.
**Refactor:** Garantir que o cookie cache esteja desabilitado para bloqueios imediatos.
**Comando de verificação:** `npm run lint && npm run typecheck`
**Criterio de aceite:** Better Auth configurado, endpoints bloqueados, plugin Admin ativo.

## Task 4: Serviço de Domínio para Campanhas
**Arquivos:** `lib/services/campaign.ts`, `app/dashboard/campanhas/actions.ts`, `app/dashboard/campanhas/page.tsx`, `app/dashboard/campanhas/[id]/page.tsx`.
**Interfaces:** `createCampaign`, `updateCampaign`, `transitionCampaign`, `listCampaigns`.
**Teste RED:** Testes unitários para máquina de estados `draft -> open -> closed`, validação de transições, preenchimento de `openedAt` e `closedAt`.
**Implementação GREEN:** Implementar serviço de campanha com validação de transições, server actions para CRUD, páginas de listagem e detalhe.
**Refactor:** Garantir isolamento por papel (admin vs líder).
**Comando de verificação:** `npm run test`
**Criterio de aceite:** Campanhas podem ser criadas, editadas e transicionadas conforme regras.

## Task 5: Sistema de Convite de Líder com Resend e Locks
**Arquivos:** `lib/services/invitation.ts`, `lib/services/email.ts`, `app/dashboard/lideres/actions.ts`, `app/dashboard/lideres/page.tsx`.
**Interfaces:** `inviteLeader`, `resendLeaderInvite`, `acceptInvite`, `completePasswordReset`.
**Teste RED:** Testes de integração para: convite idempotente, reenvio com lock, consumo único, expiração de token, bloqueio de convite para email existente.
**Implementação GREEN:** Implementar convite com `auth.api.createUser` (senha aleatória, banido), token de redefinição via Better Auth, envio via Resend com idempotência, locks `pg_advisory_lock`.
**Refactor:** Garantir que o callback `sendResetPassword` envie mensagem correta (convite vs recuperação).
**Comando de verificação:** `npm run test`
**Criterio de aceite:** Fluxo de convite completo, com locks e idempotência.

## Task 6: Validação, Normalização e Rate Limit
**Arquivos:** `lib/validation.ts`, `lib/normalization.ts`, `lib/rate-limit.ts`, `lib/services/voter.ts`.
**Interfaces:** `normalizePhone`, `validateVoterData`, `checkRateLimit`.
**Teste RED:** Testes unitários para normalização de telefone (NFKC, remoção de +55/55/0), validação de nome/zona/seção, cálculo de HMAC, incremento atômico.
**Implementação GREEN:** Implementar funções de normalização/validação, rate limit com `registration_rate_limit`, campo-isca.
**Refactor:** Garantir que todas as regras sejam executadas no servidor com Zod.
**Comando de verificação:** `npm run test`
**Criterio de aceite:** Validação robusta, rate limit funcionando, campo-isca ativo.

## Task 7: Cadastro Público de Eleitor com Transação
**Arquivos:** `app/c/[campaignSlug]/[publicCode]/page.tsx`, `app/c/[campaignSlug]/[publicCode]/actions.ts`, `lib/services/voter.ts`.
**Interfaces:** `registerVoter`, `resolvePublicLink`.
**Teste RED:** Testes de integração para: cadastro válido, duplicidade na mesma campanha, cadastro em campanhas diferentes, bloqueio por campanha fechada, bloqueio por link revogado.
**Implementação GREEN:** Implementar resolução de link público, transação com `SELECT ... FOR SHARE` nas linhas de campanha, vínculo e líder, INSERT condicionado, tratamento de erros.
**Refactor:** Garantir que o líder não seja editável no formulário.
**Comando de verificação:** `npm run test`
**Criterio de aceite:** Cadastro público funciona com concorrência e bloqueios.

## Task 8: Consultas, Filtros e Escopo
**Arquivos:** `app/dashboard/eleitores/actions.ts`, `app/dashboard/eleitores/page.tsx`, `lib/services/voter.ts`.
**Interfaces:** `listVoters`, `getVoterStats`, `editVoter`, `deleteVoter`.
**Teste RED:** Testes de integração para: paginação, filtros combináveis, busca por nome/telefone, escopo por líder, exclusão de administrador.
**Implementação GREEN:** Implementar consultas paginadas no servidor, filtros, totais, edição/exclusão apenas para admin, auditoria de eventos.
**Refactor:** Garantir que totais refletem todo o conjunto autorizado e filtrado.
**Comando de verificação:** `npm run test`
**Criterio de aceite:** Listagem funciona com filtros e escopo correto.

## Task 9: Exportação CSV com Streaming
**Arquivos:** `app/api/eleitores/exportar/route.ts`, `lib/csv.ts`, `lib/services/export.ts`, `app/privacidade/page.tsx`.
**Interfaces:** `exportCsv`. Página `/privacidade` deve ser criada e publicação bloqueada até: base legal definida, política de privacidade aprovada, retenção de dados concreta e RIPD (Registro de Impacto à Proteção de Dados) implementado.
**Variáveis de ambiente obrigatórias:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `RATE_LIMIT_SECRET`.
**Teste RED:** Testes de integração para: CSV com filtros, sanitização de fórmulas, encoding UTF-8 BOM, separador ponto e vírgula, streaming.
**Implementação GREEN:** Implementar exportação com cursor PostgreSQL, streaming síncrono com limite de 100.000 registros (rejeição acima desse limite), `Cache-Control: no-store`, `Content-Disposition: attachment`, sanitização de valores iniciados por `=`, `+`, `-`, `@`.
**Retenção de dados:** `audit_event` deve ser retido por 365 dias.
**Refactor:** Garantir que a exportação respeite o escopo do usuário.
**Comando de verificação:** `npm run test`
**Criterio de aceite:** CSV exporta até 100 mil registros em streaming, página `/privacidade` criada, variáveis configuradas.

## Task 10: UI Responsiva e Acessível
**Arquivos:** `components/ui/*`, `app/c/[campaignSlug]/[publicCode]/page.tsx`, `app/dashboard/**/*`.
**Interfaces:** Componentes shadcn/ui adaptados.
**Teste RED:** Testes E2E com Playwright para: viewport móvel (320px), navegação por teclado, contraste WCAG 2.2 AA, `aria-live` para estados.
**Implementação GREEN:** Adaptar componentes shadcn/ui para responsividade, acessibilidade (labels, instruções, erros), foco em resumo de erros, alvos de toque 44x44px.
**Refactor:** Garantir que tabelas privadas usem cartões em telas pequenas.
**Comando de verificação:** `npx playwright test`
**Criterio de aceite:** UI funciona em 320px e por teclado, acessível.

## Task 11: E2E e CI
**Arquivos:** `tests/e2e/*.spec.ts`, `.github/workflows/ci.yml`.
**Interfaces:** Fluxos E2E: login, convite, campanha, cadastro, filtros, CSV.
**Teste RED:** Testes E2E para todos os fluxos críticos.
**Implementação GREEN:** Implementar testes E2E, configurar CI com lint, typecheck, unitários, integração, E2E, build, auditoria.
**Refactor:** Garantir que testes sejam estáveis e rápidos.
**Comando de verificação:** `npx playwright test && npm run lint && npm run typecheck && npm run build && npm audit --omit=dev`
**Criterio de aceite:** Todos os testes passam, CI configurado.

## Task 12: Auditoria e Segurança Final
**Arquivos:** `lib/services/audit.ts`, `middleware.ts`, `app/api/auth/[...all]/route.ts`.
**Interfaces:** `logAuditEvent`, configuração de middleware para redirecionamento.
**Teste RED:** Testes de integração para: log de eventos sem dados pessoais, bloqueio de endpoints HTTP do plugin Admin, bloqueio de POST direto de reset.
**Implementação GREEN:** Implementar log de auditoria (ação, entidade, ator, data), configurar middleware, validar headers de segurança (`Referrer-Policy`, `Cache-Control`).
**Refactor:** Garantir que logs não contenham nome ou telefone.
**Comando de verificação:** `npm run test && npm run lint && npm run typecheck`
**Criterio de aceite:** Auditoria completa, segurança validada.