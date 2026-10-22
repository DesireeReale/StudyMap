import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-scan-review");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

function scannedPdf(pages: number): string {
  const file = path.join(process.cwd(), "e2e", ".tmp", `scan-${pages}.pdf`);
  const doc = new jsPDF();
  for (let i = 0; i < pages; i++) {
    if (i) doc.addPage();
    doc.setFillColor(40, 40, 40);
    doc.rect(20, 30 + i, 120, 4, "F");
    doc.rect(20, 50, 90, 4, "F");
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(doc.output("arraybuffer")));
  return file;
}

test("the student checks the uncertain words of a scan before the generations start", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("file-input").setInputFiles(scannedPdf(2));
  await expect(page.getByText(/Le pagine sono scansionate/)).toBeVisible();
  await page.locator("label", { hasText: /^✓?Riassunto$/ }).click();
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/controlla$/, { timeout: 60_000 });

  await expect(page.getByRole("heading", { name: "Controlla il testo" })).toBeVisible();
  await expect(page.getByText("4 parole incerte da controllare.")).toBeVisible();
  const first = page.getByLabel(/^Parola incerta 1 di 4/);
  await expect(first).toHaveValue("trascritto");
  await first.fill("trascritto bene");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Parola incerta 2 di 4/)).toBeFocused();
  await page.keyboard.type("leggibile");
  await page.getByRole("button", { name: "Conferma e crea" }).click();
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);

  await page.locator("summary", { hasText: "Testo estratto" }).click();
  await expect(page.getByText(/Testo trascritto bene di prova con una parola leggibile/)).toBeVisible();
  const tray = page.getByRole("region", { name: "Lavori in corso" });
  await tray.getByRole("link", { name: "Apri il riassunto" }).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/notes\//);
});

test("a scan longer than the plan allows is cut to the chosen pages and compressed", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("file-input").setInputFiles(scannedPdf(25));
  await expect(page.getByLabel("Dalla pagina", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("alla pagina", { exact: true })).toHaveValue("20");
  await expect(page.getByText(/al massimo 20 pagine per file/)).toBeVisible();
  await page.getByLabel("Dalla pagina", { exact: true }).fill("24");
  await page.getByLabel("alla pagina", { exact: true }).fill("25");
  const uploads: number[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT" && r.url().includes("/storage/")) uploads.push(r.postDataBuffer()?.length ?? 0);
  });
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/controlla$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Pagina 2" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pagina 3" })).toHaveCount(0);
  expect(uploads.length).toBe(1);
  expect(uploads[0]).toBeLessThan(300_000);
});
