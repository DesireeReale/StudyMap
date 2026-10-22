import path from "node:path";
import { expect, test } from "@playwright/test";

const dir = path.join(process.cwd(), "e2e", ".tmp");

test("the landing footer credits the author with the fox", async ({ page }) => {
  for (const [width, colorScheme] of [[1280, "light"], [375, "dark"]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const footer = page.locator("footer");
    const credit = footer.getByRole("link", { name: "Desirèe Reale" });
    await expect(credit).toHaveAttribute("href", "https://desireereale.netlify.app/");
    await expect(credit).toHaveAttribute("target", "_blank");
    await footer.scrollIntoViewIfNeeded();
    await expect.poll(() => footer.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await footer.screenshot({ path: path.join(dir, `footer-${width}.png`) });
  }
});
