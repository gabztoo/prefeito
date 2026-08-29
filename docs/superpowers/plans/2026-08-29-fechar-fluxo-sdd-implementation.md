# Fechar Fluxo SDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar somente os fluxos aprovados do SDD: recuperação de senha, cadastro público, rate limit, operações administrativas, auditoria e isolamento das consultas.

**Architecture:** Manter Next.js App Router com páginas públicas e server actions. Regras de autorização e negócio permanecerão nos serviços server-only; as páginas apenas validarão sessão, comporão componentes e exibirão resultados. Operações que alteram vínculo, usuário ou eleitor usarão transações PostgreSQL quando houver concorrência ou unicidade envolvida.

**Tech Stack:** Next.js 15, React 19, TypeScript, Better Auth, Drizzle ORM, PostgreSQL/Neon, Vitest e Playwright.

## Global Constraints

- Alterar somente os fluxos explicitamente aprovados nesta tarefa.
- Toda mutação e consulta privada continuará validando sessão e papel no servidor.
- O endpoint HTTP direto `/api/auth/reset-password` continuará bloqueado.
- A normalização canônica de telefone será usada em cadastro, edição e busca.
- O escopo de líder será baseado em todos os vínculos ativos do usuário.
- Auditoria não armazenará nome, telefone ou cópia de dados pessoais.
- O cadastro público continuará aceitando apenas campanhas abertas e links ativos.
- O rate limit continuará limitado a cinco tentativas por IP/vínculo em janela de dez minutos.

---

### Task 1: Recuperação de senha

**Files:**
- Create: `app/esqueci-senha/page.tsx`
- Create: `app/esqueci-senha/actions.ts`
- Create: `app/redefinir-senha/page.tsx`
- Modify: `app/sign-in/page.tsx`
- Modify: `app/api/auth/[...all]/route.ts`
- Modify: `lib/auth.ts`
- Modify: `lib/services/invitation.ts`
- Modify: `.env.example`
- Test: `tests/unit/password-reset-flow.test.ts`

**Interfaces:**
- Produce `requestPasswordReset(email: string): Promise<ActionResult<void>>` as a server action that returns a neutral result for unknown, pending-invite, active, and banned accounts.
- Produce `completePasswordReset({ token, newPassword }: { token: string; newPassword: string }): Promise<ActionResult<void>>` that invokes Better Auth server-only after validating the current verification record.
- Configure `resetPasswordTokenExpiresIn: 172800`, `revokeSessionsOnPasswordReset: true`, and `sendResetPassword` in Better Auth.

- [ ] **Step 1: Write failing tests**

Add tests asserting that the reset request returns the same neutral success shape for an unknown address and a pending invite, and that the password policy rejects fewer than 12 or more than 128 characters.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/unit/password-reset-flow.test.ts`

Expected: FAIL because the reset action and password policy are not implemented.

- [ ] **Step 3: Implement the server-only reset flow**

Create the two pages with labeled e-mail/password/token controls. The request action must call Better Auth's reset request API without exposing whether an e-mail exists. The reset page must submit the token only through the server action; it must not call `/api/auth/reset-password` from the browser.

- [ ] **Step 4: Add the sign-in recovery link and security headers**

Add a link from `app/sign-in/page.tsx` to `/esqueci-senha`. Apply `Referrer-Policy: no-referrer` and `Cache-Control: no-store` to token-page responses through the page metadata/headers mechanism used by the app.

- [ ] **Step 5: Run focused and existing tests**

Run: `npx vitest run tests/unit/password-reset-flow.test.ts tests/unit/auth-authorization.test.ts`

Expected: all focused tests pass and the direct reset endpoint remains `404` or `405`.

---

### Task 2: Cadastro público e rate limit

**Files:**
- Modify: `lib/services/voter.ts`
- Modify: `lib/rate-limit.ts`
- Modify: `app/c/[campaignSlug]/[publicCode]/page.tsx`
- Modify: `app/c/[campaignSlug]/[publicCode]/voter-registration-form.tsx`
- Test: `tests/unit/rate-limit.test.ts`
- Test: `tests/integration/voter-registration.test.ts`

**Interfaces:**
- Keep `registerVoter(campaignSlug, publicCode, data, headers)` as the public registration entry point.
- Keep `incrementRateLimit(ip, linkId, window)` but compute expiration from the actual ten-minute window boundary and use an atomic `WHERE count < 5 RETURNING` update.

- [ ] **Step 1: Write failing rate-limit and registration tests**

Cover: expiration at the next ten-minute boundary, the fifth attempt being allowed, the sixth denied without incrementing past five, valid registration, duplicate phone, closed campaign, revoked link, and a concurrent close that prevents insertion.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run tests/unit/rate-limit.test.ts tests/integration/voter-registration.test.ts`

Expected: the new boundary/atomicity/concurrency assertions fail against the current implementation.

- [ ] **Step 3: Fix the rate limit SQL**

Use `windowStart = windowMinutes * 10 * 60 * 1000` and `expiresAt = new Date(windowStart + 10 * 60 * 1000)`. Use `ON CONFLICT ... DO UPDATE ... WHERE count < 5 RETURNING count`; no returned row means `allowed: false`.

- [ ] **Step 4: Fix the registration transaction**

Resolve the campaign, campaign leader, and user inside one transaction with `LIMIT 1 FOR SHARE` in valid PostgreSQL order. Re-read `open`, `active`, and `banned` state before inserting. Map closed and inactive states to their declared `ActionResult` codes and map unique violations to `DUPLICATE_PHONE`.

- [ ] **Step 5: Add purpose notice and privacy link**

Render a short Portuguese notice before the form, with a real `Link href="/privacidade"`, and keep the confirmation free of phone, zone, and section values. Ensure labels, errors, and live regions remain associated.

- [ ] **Step 6: Run focused and full unit/integration tests**

Run: `npm run test`

Expected: all existing and new tests pass.

---

### Task 3: Link and leader administration

**Files:**
- Modify: `lib/services/campaign.ts`
- Modify: `app/dashboard/campanhas/actions.ts`
- Modify: `app/dashboard/campanhas/[id]/page.tsx`
- Modify: `lib/services/invitation.ts`
- Modify: `app/dashboard/lideres/actions.ts`
- Modify: `app/dashboard/lideres/page.tsx`
- Test: `tests/unit/campaign-links-admin.test.ts`
- Test: `tests/integration/leader-administration.test.ts`

**Interfaces:**
- Produce `revokeCampaignLeaderLink(campaignLeaderId, adminId)` and `regenerateCampaignLeaderLink(campaignLeaderId, adminId)` with admin-only server actions.
- Produce `deactivateLeader(leaderId, adminId)` that, in one transaction, locks campaign/link/user rows in the global order, deactivates all links, bans the user, and deletes all sessions.
- Produce `resendLeaderInvite` only if needed by the existing leader UI; it must not reactivate a leader whose ban reason is not `pending-invite`.

- [ ] **Step 1: Write failing service tests**

Assert that revocation makes the public link unusable, regeneration changes the code and invalidates the old code, and deactivation removes sessions and deactivates every link for that leader.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run tests/unit/campaign-links-admin.test.ts tests/integration/leader-administration.test.ts`

Expected: FAIL because the service methods and actions do not exist.

- [ ] **Step 3: Implement link operations**

Use admin-validated server actions. Revocation updates `active=false`; regeneration writes a fresh `randomBytes(32).toString("base64url")` code and keeps the link active only when the campaign and leader are eligible.

- [ ] **Step 4: Implement leader deactivation**

In a single `db.transaction`, update all `campaign_leader.active` rows to false, update `user.banned=true` and `banReason` to the deactivation reason, and delete `session` rows for the user. Do not call `auth.api.banUser` as a second transaction.

- [ ] **Step 5: Add controls to admin pages**

Add revoke/regenerate controls beside each campaign link and deactivate/resend controls for leaders. Use confirmation for destructive actions and announce result/error states.

- [ ] **Step 6: Run tests**

Run: `npm run test`

Expected: all tests pass, including old-link invalidation and session removal.

---

### Task 4: Voter administration and persistent audit

**Files:**
- Modify: `lib/services/voter.ts`
- Modify: `app/dashboard/eleitores/actions.ts`
- Modify: `app/dashboard/eleitores/voters-table.tsx`
- Modify: `lib/services/audit.ts`
- Test: `tests/unit/audit.test.ts`
- Test: `tests/integration/voter-administration.test.ts`

**Interfaces:**
- Keep `editVoter` and `deleteVoter` as admin-only service methods, but validate all changed fields with `validateVoterData`/the canonical normalizer.
- Make `logAuditEvent` insert `{ actorId, action, entityType, entityId, createdAt }` into `audit_event` and never persist personal payload fields.

- [ ] **Step 1: Write failing tests**

Cover admin edit success, normalized phone edit, duplicate phone rejection under the database unique constraint, leader edit/delete denial, permanent delete after action, and persisted audit records without name/phone fields.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run tests/unit/audit.test.ts tests/integration/voter-administration.test.ts`

Expected: FAIL because the UI edit action is disabled and audit does not write to PostgreSQL.

- [ ] **Step 3: Implement validated edit/delete and auditing**

Validate the merged voter record before updating. Catch PostgreSQL unique violations as `DUPLICATE_PHONE`. Call `logAuditEvent` after successful create/update/delete/link/admin operations with only IDs and action metadata.

- [ ] **Step 4: Enable the edit UI**

Replace disabled pencil buttons with an accessible edit dialog/form. Keep delete confirmation explicit, use `useTransition`, and refresh the list after success.

- [ ] **Step 5: Run tests**

Run: `npm run test`

Expected: all tests pass and audit rows are present in `audit_event`.

---

### Task 5: Leader scope, search, ordering and statistics

**Files:**
- Modify: `lib/services/voter.ts`
- Modify: `lib/services/campaign.ts`
- Modify: `lib/services/export.ts`
- Test: `tests/unit/voter-query-contract.test.ts`
- Test: `tests/integration/leader-scope.test.ts`

**Interfaces:**
- `listVoters` must filter leaders with all active `campaign_leader.id` values belonging to `userId`.
- `getVoterStats` must aggregate all active links for the leader and return campaign totals in that scope.
- `getCampaign` must return only the requesting leader's link data when `role === "leader"`.

- [ ] **Step 1: Write failing scope/query tests**

Create a leader with two active campaign links and voters in both. Assert both appear, a voter from another leader does not, search matches name and normalized phone, and result order is `createdAt DESC`. Assert a leader cannot receive another leader's public code from `getCampaign`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run tests/unit/voter-query-contract.test.ts tests/integration/leader-scope.test.ts`

Expected: FAIL because current code selects only the first link, searches only names, orders ascending, and returns all campaign links.

- [ ] **Step 3: Implement all-link scope**

Use an `EXISTS`/subquery against `campaign_leader` or `inArray` of all active link IDs. Apply the same scope to count, page query, campaign stats, leader stats, and exports. Preserve admin behavior unchanged.

- [ ] **Step 4: Implement canonical search and ordering**

Normalize the search phone candidate with `normalizePhone`; search names with `ILIKE` and phones with exact normalized equality when valid. Use `desc(voter.createdAt)` for every list query.

- [ ] **Step 5: Restrict campaign link details**

For leaders, add `eq(campaign_leader.leaderId, userId)` to the returned link query. Keep the admin query unrestricted.

- [ ] **Step 6: Run tests**

Run: `npm run test`

Expected: all tests pass, including multi-campaign leader isolation.

---

### Task 6: Final verification of the approved scope

**Files:**
- Modify: `tests/e2e/login.spec.ts`
- Modify: `tests/e2e/voter-registration.spec.ts`
- Modify: `tests/e2e/campaign.spec.ts`
- Create: `tests/e2e/password-recovery.spec.ts`
- Create: `tests/e2e/admin-flows.spec.ts`

- [ ] **Step 1: Add E2E coverage for newly closed flows**

Cover password recovery page navigation, public privacy notice/link, admin edit/delete, link revoke/regenerate controls, WhatsApp share URL, and leader scope. Use configured fixtures and skip only when required test credentials/data are absent.

- [ ] **Step 2: Install/verify the Playwright browser**

Run: `npx playwright install chromium`

Expected: Chromium is available to the configured Playwright version.

- [ ] **Step 3: Run the full verification suite**

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm run test`

Run: `npm run test:integration`

Run: `npm run test:e2e`

Expected: unit/integration tests pass; E2E either passes or reports only explicitly skipped tests due to absent environment fixtures.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check`

Run: `git status --short`

Expected: only files belonging to the approved scope are changed by this work.
