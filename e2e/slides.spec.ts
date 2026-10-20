import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../tests/supabase";

const slides = path.join(process.cwd(), "tests", "fixtures", "lezione.pptx");
const legacy = path.join(process.cwd(), "e2e", ".tmp", "vecchie.ppt");
let user: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  mkdirSync(path.dirname(legacy), { recursive: true });
  writeFileSync(legacy, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  user = await createTestUser("e2e-slides");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

test("upload PowerPoint slides, read their pictures and summarise them", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/upload");
  await page.getByTestId("file-input").setInputFiles(legacy);
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page.getByText(/vecchio file \.doc o \.ppt/)).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(slides);
  await expect(page.getByLabel("Leggi anche immagini, schemi e formule")).toBeChecked();
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page).toHaveURL(/\/documents\//);
  await expect(page.getByText("PowerPoint · 2 slide")).toBeVisible();
  await page.locator("summary", { hasText: "Testo estratto" }).click();
  const text = page.locator("details").filter({ hasText: "Testo estratto" });
  await expect(text).toContainText("Introduzione alla cinematica");
  await expect(text).toContainText("Figura: Grafico velocità-tempo");
  await expect(text).toContainText("Note del relatore:");

  const chat = page.getByRole("region", { name: "Chiedi al documento" });
  await chat.getByLabel("La tua domanda").fill("Quali sono i sintomi?");
  await chat.getByRole("button", { name: "Chiedi" }).click();
  await expect(chat.getByText(/lo scompenso si manifesta con dispnea/)).toBeVisible();
  await chat.getByRole("button", { name: "Slide 1" }).click();
  await expect(page.locator("[popover]:popover-open")).toContainText("Introduzione alla cinematica");
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(chat.getByText("Quali sono i sintomi?")).toBeVisible();
  await chat.getByRole("button", { name: "Nuova conversazione" }).click();
  await expect(chat.getByText("Quali sono i sintomi?")).toBeHidden();

  await page.getByRole("button", { name: "Riassunto" }).click();
  await expect(page).toHaveURL(/\/notes\//);
});
