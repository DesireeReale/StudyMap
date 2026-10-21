import { expect, test } from "@playwright/test";
import { BETA_TERMS_VERSION } from "../src/config/beta";
import { admin, createTestUser, deleteTestUser } from "../tests/supabase";

const created: string[] = [];

test.afterAll(async () => {
  await Promise.all(created.map((id) => deleteTestUser(id)));
});

test("signing up requires accepting the beta terms and sends their version", async ({ page }) => {
  let sent: { data?: { beta_terms_version?: string } } | null = null;
  await page.route("**/auth/v1/signup**", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { id: crypto.randomUUID(), email: "nuova@studymap.test", identities: [] } });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Non hai un account? Registrati" }).click();
  await page.getByLabel("Email").fill("nuova@studymap.test");
  await page.getByLabel("Password", { exact: true }).fill(`pw-${crypto.randomUUID()}`);
  const terms = page.getByRole("checkbox", { name: /Accetto le condizioni della beta/ });
  await expect(terms).not.toBeChecked();
  await page.getByRole("button", { name: "Crea account" }).click();
  expect(await terms.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(sent).toBeNull();

  await terms.check();
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.getByText("Controlla la tua email per confermare la registrazione.")).toBeVisible();
  expect(sent!.data?.beta_terms_version).toBe(BETA_TERMS_VERSION);
});

test("an existing account sees the beta terms on first access before using the app", async ({ page }) => {
  const user = await createTestUser("e2e-beta-existing", { betaTerms: false });
  created.push(user.id);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Condizioni della beta" })).toBeVisible();
  await page.goto("/upload");
  await expect(page.getByRole("heading", { name: "Condizioni della beta" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Ho letto e accetto le condizioni della beta" }).check();
  await page.getByRole("button", { name: "Accetto e continuo" }).click();
  await expect(page.getByRole("heading", { name: "Carica materiale" })).toBeVisible();
  const { data: profile } = await admin.from("profiles").select("beta_terms_version").eq("id", user.id).single();
  expect(profile?.beta_terms_version).toBe(BETA_TERMS_VERSION);
});
