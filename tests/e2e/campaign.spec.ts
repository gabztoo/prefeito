import { test, expect } from "@playwright/test";

test.describe("Campanhas", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "Credenciais de teste nao configuradas");
      return;
    }

    await page.goto("/sign-in");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/campanhas");
  });

  test("deve listar campanhas", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /campanhas/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
  });

  test("deve criar nova campanha", async ({ page }) => {
    await page.getByRole("button", { name: /nova campanha/i }).click();

    const nomeInput = page.getByLabel(/nome/i).or(page.getByPlaceholder(/nome/i));
    await expect(nomeInput).toBeVisible();

    const nomeCampanha = `Campanha Teste ${Date.now()}`;
    await nomeInput.fill(nomeCampanha);
    await page.getByRole("button", { name: /criar/i }).click();

    await expect(page.getByText(nomeCampanha)).toBeVisible();
  });

  test("deve filtrar campanhas por status", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const filtro = page.getByRole("combobox", { name: /status/i });
    if (await filtro.isVisible()) {
      await filtro.click();
      await page.getByRole("option", { name: /aberta/i }).click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("deve editar campanha existente", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const primeiraCampanha = page.locator("[data-testid='campaign-card']").first();
    if (await primeiraCampanha.isVisible()) {
      await primeiraCampanha.getByRole("button", { name: /editar/i }).click();
      await expect(page.getByRole("heading", { name: /editar/i })).toBeVisible();
    }
  });

  test("deve transitar campanha para aberta", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const campanhaRascunho = page.locator("[data-testid='campaign-status']:has-text('rascunho')").first();
    if (await campanhaRascunho.isVisible()) {
      await page.locator("[data-testid='campaign-card']").first().getByRole("button", { name: /abrir/i }).click();
      await expect(page.getByText(/campanha aberta/i)).toBeVisible();
    }
  });
});
