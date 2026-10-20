import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;
test.beforeAll(async () => { user = await createTestUser("e2e-long-summary"); });
test.afterAll(async () => { if (user) await deleteTestUser(user.id); });

test("long summary stays inside its sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);
  const sections = Array.from({ length: 12 }, (_, i) => `## Sezione ${i + 1}\n- ${"Un punto abbastanza lungo da andare a capo più volte nel foglio di lettura. ".repeat(3)}\n- Secondo punto della sezione.`).join("\n\n");
  await page.goto("/upload");
  await page.getByText("Testo o appunti").click();
  await page.getByLabel("Titolo").fill("Riassunto lungo");
  await page.getByRole("textbox", { name: "Testo" }).fill(sections);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/notes\//);
  const sheet = page.locator("article").first();
  const sheetBox = await sheet.locator("..").boundingBox();
  const lastBox = await sheet.locator("p").last().boundingBox();
  const counter = await page.getByText(/caratteri$/).boundingBox();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(sheetBox!.y + sheetBox!.height);
  expect(counter!.y).toBeGreaterThanOrEqual(sheetBox!.y + sheetBox!.height);
});
