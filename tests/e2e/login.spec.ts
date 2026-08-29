import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
  });

  test("deve exibir formulario de login", async ({ page }) => {
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("deve falhar com credenciais invalidas", async ({ page }) => {
    await page.getByLabel(/e-mail/i).fill("usuario@inexistente.com");
    await page.getByLabel(/senha/i).fill("senhaerrada123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais/i)).toBeVisible();
  });

  test("deve fazer login com credenciais validas", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "Credenciais de teste nao configuradas");
      return;
    }

    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test("deve navegar para recuperacao de senha", async ({ page }) => {
    await expect(page.getByRole("link", { name: /esqueci minha senha/i })).toBeVisible();
  });

  test("deve bloquear signup publico", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
