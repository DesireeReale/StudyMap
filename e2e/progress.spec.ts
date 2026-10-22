import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

const dir = path.join(process.cwd(), "e2e", ".tmp");
const pdfPath = path.join(dir, "lungo.pdf");
let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  const doc = new jsPDF();
  doc.text("Lo scompenso cardiaco è una sindrome clinica caratterizzata da dispnea ed edemi declivi.", 10, 10);
  for (let i = 0; i < 19; i++) doc.addPage();
  mkdirSync(dir, { recursive: true });
  writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
  user = await createTestUser("e2e-progress");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("upload a long PDF, browse elsewhere and follow the progress until the map opens", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByLabel("Titolo").fill("Scompenso cardiaco");
  await page.getByTestId("file-input").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page.getByText("Sto leggendo il file.")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/library/);
  const tray = page.getByRole("region", { name: "Lavori in corso" });
  await expect(tray.getByText(/Sto leggendo pagina \d+ di 19/)).toBeVisible({ timeout: 20_000 });
  await tray.screenshot({ path: path.join(dir, "progress-reading.png") });

  await tray.getByRole("link", { name: "Apri il documento" }).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/documents\/[^/]+\/controlla$/);
  await page.getByRole("button", { name: "Conferma il testo" }).click();
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);

  await page.getByRole("button", { name: "Genera mappa concettuale" }).click();
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/library/);
  await expect(tray.getByText(/Creo la mappa/)).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: path.join(dir, "progress-map.png") });

  await tray.getByRole("link", { name: "Apri la mappa" }).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/maps\//);
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  await expect(tray).toBeHidden();
});
