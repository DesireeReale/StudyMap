import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-study");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("write a note, get a summary and take a quiz", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload?mode=text");
  await page.getByLabel("Titolo").fill("Scompenso cardiaco");
  await page.getByRole("textbox", { name: "Testo" }).fill("Lo scompenso cardiaco è una sindrome clinica con dispnea ed edemi declivi.");
  await page.getByRole("button", { name: "Carica", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\//);
  const noteUrl = page.url();

  await page.getByRole("button", { name: "Riassunto" }).click();
  await expect(page).toHaveURL(/\/notes\//);
  await expect(page).not.toHaveURL(noteUrl);
  await expect(page.getByRole("heading", { level: 3, name: "Segni e sintomi" })).toBeVisible();

  await page.goto(noteUrl);
  await page.getByRole("button", { name: "Quiz" }).click();
  await expect(page).toHaveURL(/\/quizzes\//);
  await expect(page.getByRole("heading", { name: "Prima di iniziare" })).toBeVisible();
  await page.getByText("Tutti", { exact: true }).click();
  await page.getByRole("button", { name: "Inizia" }).click();
  await page.keyboard.press("1");
  await expect(page.getByText("Esatto.")).toBeVisible();
  await page.getByRole("button", { name: "Prossima domanda" }).click();
  await page.keyboard.press("2");
  await expect(page.getByText("L'affermazione è vera.")).toBeVisible();
  await page.getByRole("button", { name: "Prossima domanda" }).click();
  await page.getByPlaceholder("Scrivi la parola mancante").fill("Semi fowler");
  await page.getByRole("button", { name: "Controlla" }).click();
  await expect(page.getByText("Esatto.")).toBeVisible();
  await page.getByRole("button", { name: "Vedi il risultato" }).click();
  await expect(page.getByText("Quiz finito")).toBeVisible();
  await expect(page.getByRole("region", { name: "Da ripassare" })).toContainText("Un aumento rapido del peso");
  await page.getByRole("button", { name: "Rifai le sbagliate (1)" }).click();
  await expect(page.getByText(/Domanda 1 di 1/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Tentativi precedenti" })).toBeVisible();
});
