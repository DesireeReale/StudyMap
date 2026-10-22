import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-chapter-maps");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("a long document with chapters gets one map per chapter and an overview", async ({ page }) => {
  const file = path.join(process.cwd(), "e2e", ".tmp", "chapters.pdf");
  const doc = new jsPDF();
  ["CAPITOLO 1 IL CUORE", "Il ciclo cardiaco", "CAPITOLO 2 IL RENE", "La filtrazione"].forEach((title, i) => {
    if (i) doc.addPage();
    doc.text(title, 10, 10);
    doc.text("Testo della pagina con abbastanza parole per essere letto come testo normale.", 10, 20);
  });
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(doc.output("arraybuffer")));

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByTestId("file-input").setInputFiles(file);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\/[^/]+$/, { timeout: 60_000 });
  const docUrl = page.url();

  await page.getByRole("radio", { name: "Una per capitolo (2) e una generale" }).check();
  await page.getByRole("button", { name: "Genera mappa concettuale" }).click();
  await expect(page).toHaveURL(/\/maps\//, { timeout: 60_000 });

  await page.goto(docUrl);
  const made = page.getByRole("region", { name: "Creato da questo documento" });
  await expect(made.getByText(/· Mappa generale$/)).toBeVisible();
  await expect(made.getByText(/· 1\. Capitolo 1 il cuore$/)).toBeVisible();
  await expect(made.getByText(/· 2\. Capitolo 2 il rene$/)).toBeVisible();
});
