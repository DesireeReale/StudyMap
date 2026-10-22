import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { admin, createTestUser, deleteTestUser } from "../tests/supabase";

const dir = path.join(process.cwd(), "e2e", ".tmp");
const pdfPath = path.join(dir, "forensics.pdf");
const label = process.env.SHOT_LABEL ?? "doc";
let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  const doc = new jsPDF();
  doc.text("La computer forensics studia l'acquisizione e l'analisi delle prove digitali.", 10, 10);
  doc.addPage();
  doc.text("La catena di custodia documenta ogni passaggio della prova.", 10, 10);
  mkdirSync(dir, { recursive: true });
  writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
  user = await createTestUser("e2e-docpage");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

async function shots(page: Page, state: string) {
  await expect(page.getByText(/caricato il/)).toBeVisible();
  await page.waitForLoadState("networkidle");
  for (const width of [1920, 1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: path.join(dir, `${label}-${state}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("document page: create tiles, summary first, folded chat and text", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByLabel("Titolo").fill("Computer Forensics");
  await page.getByTestId("file-input").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\//);
  const docUrl = page.url();

  const tiles = page.getByRole("region", { name: "Crea da questo documento" });
  await expect(tiles.getByRole("listitem")).toHaveCount(4);
  await expect(tiles.getByRole("button", { name: "Crea riassunto" })).toHaveClass(/btn-primary/);
  await expect(page.getByRole("region", { name: "Chiedi al documento" }).getByLabel("La tua domanda")).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: "Riassunto", exact: true })).toHaveCount(0);
  await shots(page, "empty");

  await tiles.getByRole("button", { name: "Crea mappa concettuale" }).click();
  await expect(tiles.getByRole("button", { name: "In corso…" })).toBeVisible();
  await expect(tiles.getByRole("button", { name: "Crea riassunto" })).toBeDisabled();
  await shots(page, "busy");
  await expect(page).toHaveURL(/\/maps\//);

  await page.goto(docUrl);
  await tiles.getByRole("button", { name: "Crea riassunto" }).click();
  await expect(page).toHaveURL(/\/notes\//);
  const sections = Array.from(
    { length: 6 },
    (_, i) =>
      `## Sezione ${i + 1}\n[pagina 1]\n- La catena di custodia documenta chi ha avuto la prova digitale, quando e perché: se si interrompe, la prova può essere contestata in tribunale.\n- L'acquisizione si fa con una copia bit a bit del supporto, verificata con un hash, e l'analisi lavora solo sulla copia.${i % 2 ? "" : "\n- Le tecniche si basano sulla natura volatile dei dati, soprattutto nelle reti e nella live forensics."}`,
  );
  await admin.from("notes").update({ body: sections.join("\n") }).eq("document_id", docUrl.split("/").pop()!);
  await page.goto(docUrl);
  await expect(page.getByRole("heading", { level: 2, name: "Riassunto", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sezione 6" })).not.toBeInViewport();
  await shots(page, "summary");
  await expect(tiles.getByRole("link", { name: "Apri mappa concettuale" })).toBeVisible();
  await expect(tiles.getByText("1 riassunto")).toBeVisible();
  await tiles.getByRole("link", { name: "Leggi sotto il riassunto" }).click();
  await expect(page).toHaveURL(/#summary-title$/);

  await page.getByRole("link", { name: "Apri riassunto", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\//);
  await expect(page.getByRole("heading", { name: "Sezione 6" })).toBeVisible();
  await page.goBack();

  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => (document.documentElement.dataset.style = "evidenziatore"));
  await shots(page, "vivid-dark");
});
