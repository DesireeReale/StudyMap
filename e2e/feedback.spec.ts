import path from "node:path";
import { expect, test } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "../tests/supabase";

let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  user = await createTestUser("e2e-feedback");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("send an idea from Settings", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/settings#suggerimenti");
  const section = page.getByRole("region", { name: "Suggerisci un'idea" });
  await section.getByText("Problema", { exact: true }).click();
  await section.getByLabel("Messaggio").fill("Il quiz non salva il punteggio quando chiudo la pagina.");
  await section.getByLabel("Dove succede? (facoltativo)").fill("quiz");
  await section.getByRole("button", { name: "Invia" }).click();
  await expect(section.getByRole("status")).toHaveText("Grazie! Il messaggio è arrivato.");
  await section.screenshot({ path: path.join(process.cwd(), "e2e", ".tmp", "feedback.png") });

  const { data } = await admin.from("feature_requests").select("kind, page").eq("user_id", user.id);
  expect(data).toEqual([{ kind: "problema", page: "quiz" }]);
});
