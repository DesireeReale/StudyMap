import { expect, test, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "../tests/supabase";

let owner: Awaited<ReturnType<typeof createTestUser>>;
let student: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  [owner, student] = await Promise.all([createTestUser("e2e-owner"), createTestUser("e2e-student")]);
  await admin.from("admins").insert({ user_id: owner.id });
});

test.afterAll(async () => {
  await Promise.all([owner && deleteTestUser(owner.id), student && deleteTestUser(student.id)]);
});

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);
}

test("the owner unlocks Pro and the student sees it", async ({ browser }) => {
  const studentPage = await (await browser.newContext()).newPage();
  await signIn(studentPage, student);
  await studentPage.goto("/admin");
  await expect(studentPage.getByRole("heading", { name: "Amministrazione" })).toHaveCount(0);

  const ownerPage = await (await browser.newContext()).newPage();
  await signIn(ownerPage, owner);
  await ownerPage.goto("/admin");
  await ownerPage.getByLabel("Email dello studente").fill(student.email);
  await ownerPage.getByRole("button", { name: "Cerca" }).click();
  const card = ownerPage.getByRole("region", { name: "Studente" });
  await card.getByLabel("Scadenza (facoltativa)").fill("2099-01-31");
  await card.getByLabel("Nota").fill("pagato 25/10");
  await card.getByRole("button", { name: "Sblocca Pro" }).click();
  await expect(card.getByText("pagato 25/10")).toBeVisible();
  await expect(card.getByRole("definition").filter({ hasText: /^Pro$/ })).toBeVisible();

  await studentPage.goto("/settings#piano");
  await expect(studentPage.getByText("Sei sul piano Pro fino al 31 gennaio 2099.")).toBeVisible();
});
