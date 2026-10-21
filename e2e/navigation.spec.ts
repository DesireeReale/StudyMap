import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-navigation");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("every kind of material has its own section in the navigation", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByText("Testo incollato", { exact: true }).click();
  await page.getByLabel("Titolo").fill("Bilancio idrico");
  await page
    .getByRole("textbox", { name: "Testo" })
    .fill("Nel paziente con scompenso si registrano ogni giorno peso, entrate e uscite per valutare la ritenzione di liquidi.");
  for (const c of ["Flashcard", "Quiz", "Riassunto"]) await page.locator("label", { hasText: new RegExp(`^✓?${c}$`) }).click();
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/notes\//);
  const tray = page.getByRole("region", { name: "Lavori in corso" });
  for (const l of ["Apri le flashcard", "Apri il quiz", "Apri il riassunto"]) {
    await expect(tray.getByRole("link", { name: l })).toBeVisible({ timeout: 90_000 });
  }

  const nav = page.getByRole("navigation", { name: "Principale" });
  await nav.getByRole("link", { name: /^Flashcard/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Flashcard" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Bilancio idrico/ })).toBeVisible();

  await nav.getByRole("link", { name: "Quiz" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Quiz" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Bilancio idrico/ })).toBeVisible();

  await nav.getByRole("link", { name: "Riassunti" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: /Riassunto · Bilancio idrico/ })).toBeVisible();

  await nav.getByRole("link", { name: "Mappe" }).click();
  await expect(page.getByText("Non hai ancora mappe concettuali")).toBeVisible();

  await nav.getByRole("link", { name: "Materie" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Materie" })).toBeVisible();

  await nav.getByRole("link", { name: "Home" }).click();
  const tiles = page.getByRole("navigation", { name: "Il tuo materiale" });
  await expect(tiles.getByRole("link", { name: /Quiz\s*1/ })).toBeVisible();
  await tiles.getByRole("link", { name: /Riassunti/ }).click();
  await expect(page).toHaveURL(/\/studia\/riassunti/);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Apri il menu" }).click();
  await page.locator("#mobile-nav").getByRole("link", { name: "Quiz" }).click();
  await expect(page).toHaveURL(/\/studia\/quiz/);
});
