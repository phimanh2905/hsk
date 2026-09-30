import { test, expect } from "@playwright/test";

test("app Next render với metadata root", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nhai HSK/);
});
