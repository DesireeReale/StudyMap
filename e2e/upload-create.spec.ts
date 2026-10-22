import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-upload-create");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("choose the source with tiles and what to create while uploading", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await expect(page.getByRole("radio", { name: /Documento/ })).toBeChecked();
  await page.getByText("Foto degli appunti", { exact: true }).click();
  await expect(page.getByTestId("file-input")).toHaveAttribute("accept", "image/png,image/jpeg,image/webp");

  await page.getByText("Testo incollato", { exact: true }).click();
  await page.getByLabel("Titolo").fill("Bilancio idrico");
  await page
    .getByRole("textbox", { name: "Testo" })
    .fill("Nel paziente con scompenso si registrano ogni giorno peso, entrate e uscite per valutare la ritenzione di liquidi.");
  await page.locator("label", { hasText: /^✓?Flashcard$/ }).click();
  await expect(page.getByRole("checkbox", { name: "Flashcard" })).toBeChecked();
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/notes\//);

  const tray = page.getByRole("region", { name: "Lavori in corso" });
  await tray.getByRole("link", { name: "Apri le flashcard" }).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/decks\//);
  const status = page.getByRole("definition").first();
  await expect(page.getByLabel("Stato del mazzo")).toContainText("Mai viste");
  await expect(status).toHaveText(/\d+/);
});

test("a plan limit offers the Pro plan instead of a retry", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  const tray = page.getByRole("region", { name: "Lavori in corso" });
  for (const title of ["Primo quiz", "Secondo quiz"]) {
    await page.goto("/upload?mode=text");
    await page.getByText("Testo incollato", { exact: true }).click();
    await page.getByLabel("Titolo").fill(title);
    await page
      .getByRole("textbox", { name: "Testo" })
      .fill("La diuresi oraria normale nell'adulto è di circa 0,5-1 ml per kg di peso corporeo all'ora.");
    await page.locator("label", { hasText: /^✓?Quiz$/ }).click();
    await page.getByRole("button", { name: "Carica" }).click();
    await expect(page).toHaveURL(/\/notes\//);
  }
  await expect(tray.getByText(/1 quiz a settimana/)).toBeVisible({ timeout: 60_000 });
  await expect(tray.getByRole("link", { name: "Scopri il Pro" })).toBeVisible();
  await expect(tray.getByRole("button", { name: "Riprova" })).toHaveCount(0);
});

test("a file upload starts the chosen generations once it has been read", async ({ page }) => {
  const pdfPath = path.join(process.cwd(), "e2e", ".tmp", "create.pdf");
  const doc = new jsPDF();
  doc.text("Lo scompenso cardiaco è una sindrome clinica caratterizzata da dispnea ed edemi declivi.", 10, 10);
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByTestId("file-input").setInputFiles(pdfPath);
  await page.locator("label", { hasText: /^✓?Riassunto$/ }).click();
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\//, { timeout: 60_000 });

  const tray = page.getByRole("region", { name: "Lavori in corso" });
  await tray.getByRole("link", { name: "Apri il riassunto" }).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/notes\//);
});
