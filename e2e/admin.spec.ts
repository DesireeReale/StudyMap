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

test("the owner unlocks Pro from the users table and the student sees it", async ({ browser }) => {
  const studentPage = await (await browser.newContext()).newPage();
  await signIn(studentPage, student);
  await expect(studentPage.getByRole("link", { name: "Amministrazione" })).toHaveCount(0);
  await studentPage.goto("/admin");
  await expect(studentPage.getByRole("heading", { name: "Amministrazione" })).toHaveCount(0);

  const ownerPage = await (await browser.newContext()).newPage();
  await signIn(ownerPage, owner);
  await ownerPage.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Amministrazione" }).first().click();
  await expect(ownerPage.getByRole("heading", { name: "Amministrazione" })).toBeVisible();
  await expect(ownerPage.getByText("Pro attivi")).toBeVisible();

  await ownerPage.getByLabel("Cerca per email").fill(student.email);
  await ownerPage.getByRole("button", { name: "Cerca" }).click();
  const row = ownerPage.getByRole("row", { name: student.email });
  await expect(row).toContainText("Free");
  await row.getByText("Sblocca Pro").click();
  await row.getByLabel("Scadenza (facoltativa)").fill("2099-01-31");
  await row.getByLabel("Nota").fill("pagato 25/10");
  await row.getByRole("button", { name: "Conferma" }).click();
  await expect(row).toContainText("pagato 25/10");

  await ownerPage.getByRole("link", { name: "Pro", exact: true }).click();
  await expect(ownerPage).toHaveURL(/filter=pro/);
  await expect(ownerPage.getByRole("row", { name: student.email })).toContainText("Pro");
  await expect(ownerPage.getByRole("row", { name: student.email }).getByRole("button", { name: "Revoca" })).toBeVisible();

  await studentPage.goto("/settings#piano");
  await expect(studentPage.getByText("Sei sul piano Pro fino al 31 gennaio 2099.")).toBeVisible();
});
