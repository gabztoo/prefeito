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
