import { test, expect } from "@playwright/test";

test("app Next mặc định render", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Next/);
});
