import { test, expect } from "@playwright/test";

/* E2E flow đọc — redesign /reading (2026-10-05): thư viện ở /reading (heading
   "Thư viện bài đọc", card data-od-id="read-{id}"), reader ở /reading/{id}
   (scaffold bar + canvas + quiz). Không cần login. */

test.describe("reading redesign", () => {
  test("thư viện → reader tea: scaffold Pinyin + quiz", async ({ page }) => {
    // 1. Thư viện: tiêu đề trang + grid có card tea.
    await page.goto("/reading");
    await expect(page).toHaveTitle(/Thư viện bài đọc/);
    const grid = page.locator('[data-od-id="reading-grid"]');
    await expect(grid).toBeVisible();
    const teaCard = grid.locator('[data-od-id="read-tea"]');
    await expect(teaCard).toBeVisible();

    // 2. Mở bài tea → reader với canvas + scaffold bar.
    await teaCard.getByRole("link").click();
    await expect(page).toHaveURL(/\/reading\/tea$/);
    await expect(page.locator('[data-od-id="reading-canvas"]')).toBeVisible();
    await expect(page.locator('[data-od-id="scaffold-bar"]')).toBeVisible();

    // 3. Đổi scaffold sang Pinyin → canvas hiện pinyin câu đầu ("chádào").
    await page.getByRole("button", { name: "Pinyin", exact: true }).click();
    await expect(
      page.locator('[data-od-id="reading-canvas"]').getByText("chádào", { exact: true }),
    ).toBeVisible();

    // 4. Quiz: trả lời đúng câu 1 (option "追求内心的平静") → feedback xanh.
    const quiz = page.locator('[data-od-id="reading-quiz"]');
    await expect(quiz).toBeVisible();
    await quiz.getByRole("button", { name: "追求内心的平静" }).click();
    await expect(quiz.getByText("Chính xác!")).toBeVisible();
  });
});
