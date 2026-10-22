import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

const pdfPath = path.join(process.cwd(), "e2e", ".tmp", "contratti.pdf");
let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  const doc = new jsPDF();
  doc.text("Il contratto è l'accordo di due o più parti per costituire un rapporto giuridico patrimoniale.", 10, 10);
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
  user = await createTestUser("e2e-folders");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("create a subject and a subfolder, upload a PDF there, the map shows up in it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.getByRole("button", { name: "Nuova materia" }).click();
  await page.getByLabel("Nuova materia").fill("Diritto privato");
  await page.getByRole("button", { name: "Crea" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Diritto privato" })).toBeVisible();
  const subjectUrl = page.url();

  await page.getByRole("button", { name: "Nuova cartella" }).click();
  await page.getByLabel("Nuova cartella").fill("Scritto");
  await page.getByRole("button", { name: "Crea" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Scritto" })).toBeVisible();
  const folderUrl = page.url();

  await page.getByRole("link", { name: "Carica qui" }).click();
  await expect(page).toHaveURL(/\/upload\?folder=/);
  await expect(page.getByRole("combobox", { name: "Cartella" })).toHaveValue(folderUrl.split("/").pop()!);
  await page.getByLabel("Titolo").fill("Il contratto");
  await page.getByTestId("file-input").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\//);

  await page.getByRole("button", { name: "Crea mappa concettuale" }).click();
  await expect(page).toHaveURL(/\/maps\//);
  await expect(page.getByRole("navigation", { name: "Percorso" }).getByRole("link", { name: "Scritto" })).toBeVisible();

  await page.goto(folderUrl);
  await expect(page.getByRole("region", { name: "Materiale" }).getByRole("link", { name: /Il contratto.*Mappa/ })).toBeVisible();

  await page.goto(subjectUrl);
  await expect(page.getByRole("link", { name: /Scritto.*1 mappa/ })).toBeVisible();
});
