import { test, expect } from "@playwright/test";

test("leaderboard: tab XP tổng mặc định, đổi sang Đấu trí tháng không reload", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng" })).toBeVisible();
  await expect(page.getByText("My Phan")).toBeVisible();
  await expect(page.getByText("7.915 XP")).toBeVisible();

  await page.getByRole("tab", { name: "Đấu trí tháng" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?tab=battle$/);
  await expect(page.getByText("Minh Anh Phạm")).toBeVisible();
  await expect(page.getByText("12/15").first()).toBeVisible();
  await expect(page.getByText("My Phan")).toBeHidden();

  // URL trực tiếp ?tab=battle mở đúng tab
  await page.goto("/leaderboard?tab=battle");
  await expect(page.getByRole("tab", { name: "Đấu trí tháng" })).toHaveAttribute("aria-selected", "true");
});
