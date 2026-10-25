import { test, expect } from "@playwright/test";

/* W6.3 — E2E trang thi demo HSK1 (guest — không cần session; guest chỉ xem
   điểm, không POST /api/v1/exam/results). Flow: /certificate-test → card HSK 1
   → trả lời hết 3 section (option đầu / dán sampleAnswer cho tự luận) → thấy
   tổng điểm. */

test("cert: HSK1 — guest làm hết đề demo và thấy tổng điểm", async ({ page }) => {
  await page.goto("/certificate-test");

  /* card HSK 1 giờ là Link "Làm bài thi demo" (không còn toast coming-soon) */
  await expect(page.locator('a[href="/certificate-test/hsk1"]')).toContainText("Làm bài thi demo");
  await page.goto("/certificate-test/hsk1");
  await expect(page.getByRole("heading", { name: /Phần nghe/i })).toBeVisible();

  /* 3 section: chọn option đầu cho trắc nghiệm, dán sampleAnswer cho tự luận */
  for (let s = 0; s < 3; s++) {
    const options = page.locator("[data-option]");
    const frees = page.locator("[data-free]");
    const nFree = await frees.count();
    for (let i = 0; i < nFree; i++) {
      const sample = (await page.locator(`[data-sample="${i}"]`).textContent()) ?? "";
      await frees.nth(i).fill(sample.trim());
    }
    const nOpt = await options.count();
    for (let i = 0; i < nOpt; i++) {
      await options.nth(i).click();
    }
    await page.locator("[data-submit-section]").click();
  }

  const score = page.locator("[data-score]");
  await expect(score).toBeVisible();
  const n = Number((await score.textContent()) ?? "");
  expect(Number.isInteger(n)).toBe(true);
  expect(n).toBeGreaterThanOrEqual(0);
  expect(n).toBeLessThanOrEqual(12);

  /* breakdown per section + nút Thi lại */
  await expect(page.getByText(/listening/i).first()).toBeVisible();
  await expect(page.locator("[data-retry]")).toBeVisible();

  /* guest: KHÔNG có POST kết quả lên server */
  const post = await page.waitForResponse(
    (r) => r.url().includes("/api/v1/exam/results") && r.request().method() === "POST",
    { timeout: 2_000 }
  ).catch(() => null);
  expect(post).toBeNull();
});
