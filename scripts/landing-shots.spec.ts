import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../tests/supabase";

const OUT = "public/landing";

const NOTES = `Scompenso cardiaco

Lo scompenso cardiaco è una sindrome clinica in cui il cuore non riesce a garantire una gittata adeguata ai fabbisogni dell'organismo. Le cause più frequenti sono la cardiopatia ischemica, l'ipertensione arteriosa e le valvulopatie.

Segni e sintomi: dispnea da sforzo e ortopnea, edemi declivi, astenia, turgore giugulare. Nello scompenso destro prevalgono edemi ed epatomegalia, nel sinistro la congestione polmonare.

Interventi infermieristici: monitoraggio dei parametri vitali, bilancio idrico e peso quotidiano alla stessa ora, posizione semi-Fowler, educazione del paziente sulla restrizione di sodio e liquidi.`;

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("shots");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("capture product screenshots for the landing page", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByText("Testo", { exact: true }).click();
  await page.getByLabel("Titolo").fill("Scompenso cardiaco");
  await page.getByRole("textbox", { name: "Testo" }).fill(NOTES);
  await page.locator("main").screenshot({ path: `${OUT}/upload.png` });
  await page.getByRole("button", { name: "Carica", exact: true }).click();
  await expect(page).toHaveURL(/\/documents\//);
  const documentUrl = page.url();

  await page.getByRole("button", { name: "Genera flashcard" }).click();
  await expect(page).toHaveURL(/\/decks\//);
  await page.getByRole("button", { name: "Mostra la risposta" }).click();
  await page.locator("main").screenshot({ path: `${OUT}/flashcard.png` });

  await page.goto(documentUrl);
  await page.getByRole("button", { name: "Genera mappa concettuale" }).click();
  await expect(page).toHaveURL(/\/maps\//);
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.locator(".react-flow").screenshot({ path: `${OUT}/map.png` });

  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("main").screenshot({ path: `${OUT}/library.png` });
});
