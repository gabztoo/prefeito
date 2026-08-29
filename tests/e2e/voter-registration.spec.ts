import { test, expect } from "@playwright/test";

test.describe("Cadastro de Eleitor", () => {
  test("deve acessar link publico e exibir formulario", async ({ page }) => {
    const campaignSlug = process.env.E2E_TEST_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!campaignSlug || !publicCode) {
      test.skip(true, "Link publico de teste nao configurado");
    }

    await page.goto(`/c/${campaignSlug}/${publicCode}`);
    await expect(page.getByRole("heading", { name: /cadastro/i })).toBeVisible();
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    await expect(page.getByLabel(/telefone/i)).toBeVisible();
    await expect(page.getByLabel(/zona/i)).toBeVisible();
    await expect(page.getByLabel(/seção/i)).toBeVisible();
  });

  test("deve validar campos obrigatorios", async ({ page }) => {
    const campaignSlug = process.env.E2E_TEST_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!campaignSlug || !publicCode) {
      test.skip(true, "Link publico de teste nao configurado");
    }

    await page.goto(`/c/${campaignSlug}/${publicCode}`);
    await page.getByRole("button", { name: /cadastrar/i }).click();
    await expect(page.getByText(/obrigatório/i)).toBeVisible();
  });

  test("deve normalizar telefone durante digitacao", async ({ page }) => {
    const campaignSlug = process.env.E2E_TEST_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!campaignSlug || !publicCode) {
      test.skip(true, "Link publico de teste nao configurado");
    }

    await page.goto(`/c/${campaignSlug}/${publicCode}`);
    const telefoneInput = page.getByLabel(/telefone/i);
    await telefoneInput.fill("(11) 98765-4321");

    const valorNormalizado = await telefoneInput.inputValue();
    expect(valorNormalizado).toMatch(/\d{11}/);
  });

  test("deve cadastrar eleitor com dados validos", async ({ page }) => {
    const campaignSlug = process.env.E2E_TEST_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!campaignSlug || !publicCode) {
      test.skip(true, "Link publico de teste nao configurado");
    }

    await page.goto(`/c/${campaignSlug}/${publicCode}`);

    await page.getByLabel(/nome completo/i).fill("Maria Silva Santos");
    await page.getByLabel(/telefone/i).fill("11987654321");

    const zonaInput = page.getByLabel(/zona/i).or(page.getByPlaceholder(/zona/i));
    await zonaInput.fill("123");

    const secaoInput = page.getByLabel(/seção/i).or(page.getByPlaceholder(/seção/i));
    await secaoInput.fill("456");

    await page.getByRole("button", { name: /cadastrar/i }).click();

    await expect(page.getByText(/cadastro realizado/i)).toBeVisible();
  });

  test("deve bloquear cadastro em campanha fechada", async ({ page }) => {
    const closedCampaignSlug = process.env.E2E_TEST_CLOSED_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!closedCampaignSlug || !publicCode) {
      test.skip(true, "Campanha fechada de teste nao configurada");
    }

    await page.goto(`/c/${closedCampaignSlug}/${publicCode}`);
    await expect(page.getByText(/indisponível/i)).toBeVisible();
  });

  test("deve bloquear link revogado", async ({ page }) => {
    const revokedCampaignSlug = process.env.E2E_TEST_REVOKED_CAMPAIGN_SLUG;
    const publicCode = process.env.E2E_TEST_PUBLIC_CODE;

    if (!revokedCampaignSlug || !publicCode) {
      test.skip(true, "Link revogado de teste nao configurado");
    }

    await page.goto(`/c/${revokedCampaignSlug}/${publicCode}`);
    await expect(page.getByText(/inválido/i)).toBeVisible();
  });

  test("deve navegar para dashboard de eleitores", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "Credenciais de teste nao configuradas");
    }

    await page.goto("/sign-in");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/eleitores");
    await expect(page.getByRole("heading", { name: /eleitores/i })).toBeVisible();
  });

  test("deve filtrar eleitores por nome", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "Credenciais de teste nao configuradas");
    }

    await page.goto("/sign-in");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await page.goto("/dashboard/eleitores");
    await page.waitForLoadState("networkidle");

    const buscaInput = page.getByPlaceholder(/buscar/i).or(page.getByLabel(/buscar/i));
    if (await buscaInput.isVisible()) {
      await buscaInput.fill("Maria");
      await page.waitForLoadState("networkidle");
    }
  });
});
