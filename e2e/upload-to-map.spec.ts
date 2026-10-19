import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

const pdfPath = path.join(process.cwd(), "e2e", ".tmp", "scompenso.pdf");
let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  const doc = new jsPDF();
  doc.text("Lo scompenso cardiaco è una sindrome clinica caratterizzata da dispnea ed edemi declivi.", 10, 10);
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
  user = await createTestUser("e2e");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("log in, upload a PDF, generate and edit a concept map", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.getByLabel("Titolo").fill("Scompenso cardiaco");
  await page.getByTestId("file-input").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\//);
  await expect(page.getByText("PDF · 1 pagina")).toBeVisible();

  await page.getByRole("button", { name: "Genera mappa concettuale" }).click();
  await expect(page).toHaveURL(/\/maps\//);
  const node = page.locator(".react-flow__node").filter({ hasText: /^Dispnea$/ });
  await expect(node).toBeVisible();

  await node.dblclick();
  const input = page.getByLabel("Nome del concetto");
  await input.fill("Dispnea da sforzo");
  await input.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Salvataggio…" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Salvato" })).toBeVisible();

  await page.reload();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Dispnea da sforzo" })).toBeVisible();
});
