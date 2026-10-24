import { expect, test } from "@playwright/test";

/* Smoke content D1 (plan dehardcode Pha 1) — webServer `pnpm dev` dùng D1 dev
   remote (wrangler.dev.jsonc, remote: true) đã seed content_vocabs + shadowing. */

test.describe("content từ D1", () => {
  test("course hsk1 render danh sách bài", async ({ page }) => {
    await page.goto("/course/hsk1");
    await expect(page.getByRole("heading", { name: /HSK 1/ })).toBeVisible();
  });

  test("lesson hsk1/lesson-1 render từ vựng từ D1", async ({ page }) => {
    await page.goto("/lesson/hsk1/lesson-1");
    await expect(page.locator("body")).toContainText(/你好|nǐ hǎo/i);
  });

  test("shadowing library render video từ D1", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByText("DaihuaXiyou").first()).toBeVisible();
  });

  test("playlist Hội thoại theo bài render từ D1 (W3.3)", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByText("Hội thoại theo bài").first()).toBeVisible();
  });

  // FIXME(T7): video id "hsk1/lesson-1" chứa "/" cần route catch-all + audio
  // player data-testid="audio-player" — bật lại khi Task 7 merge.
  test.fixme("video audio hội thoại hsk1/lesson-1 trả 200 và có <audio>", async ({ page }) => {
    const res = await page.goto("/shadowing/hsk1/lesson-1");
    expect(res?.status()).toBe(200);
    const audio = page.locator('audio[data-testid="audio-player"]');
    await expect(audio).toHaveCount(1);
  });

  test("lesson sai key trả 404", async ({ page }) => {
    const res = await page.goto("/lesson/hsk9/khong-co");
    expect(res?.status()).toBe(404);
  });
});
