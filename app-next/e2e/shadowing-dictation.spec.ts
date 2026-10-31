import { expect, test } from "@playwright/test";

// WSD shadowing dictation — Task 11 e2e
// Lưu ý: panel phát âm render testid "pron-box" (không phải "pron-panel").

test.describe("WSD shadowing dictation", () => {
  test("mode switch 3 tab + phím tắt", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("mode-shadow")).toBeVisible();
    await page.getByTestId("mode-dict").click();
    await expect(page.getByTestId("dict-box")).toBeVisible();
    await page.keyboard.press("3"); // Digit3
    await expect(page.getByTestId("pron-box")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByTestId("transcript-stream")).toBeVisible();
  });

  test("dictation typing sai → per-char highlight + badges; đúng → reason + score", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    // lấy nguyên văn câu 1 từ transcript (data-zh span đầu tiên)
    const answer = (await page.locator("[data-zh]").first().innerText()).replace(/\s+/g, "");
    await expect(async () => {
      await page.keyboard.press("2");
      await expect(page.getByTestId("dict-input")).toBeVisible();
    }).toPass(); // phím có thể rơi vào khoảng render → effect gắn listener
    await page.getByTestId("dict-input").fill("这是完全错误的答案啊");
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-diff")).toBeVisible();
    await expect(page.getByTestId("dict-badge-errors")).toContainText(/\d/);
    await page.getByTestId("dict-input").fill(answer);
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-reason")).toContainText("Hoàn toàn chính xác");
  });

  test("arrange: tap mảnh → ghép; thiếu mảnh check → đỏ", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("mode-shadow")).toBeVisible(); // studio render xong (client-fetch)
    await expect(async () => {
      await page.keyboard.press("2");
      await expect(page.getByTestId("dict-box")).toBeVisible();
    }).toPass(); // phím có thể rơi vào khoảng render → effect gắn listener
    await page.getByTestId("dict-variant-arrange").click();
    const bank = page.getByTestId("dict-arrange-bank");
    await expect(bank.getByTestId("dict-arrange-tile").first()).toBeVisible();
    await bank.getByTestId("dict-arrange-tile").first().click();
    await expect(page.getByTestId("dict-arrange-built").getByTestId("dict-arrange-tile")).toHaveCount(1);
    // ghép chưa đủ mà check → sai (giả định câu > 2 từ; EA3rwvr99Q0 câu 1 ≥ 3 từ)
    await page.getByTestId("dict-arrange-check").click();
    // dict-arrange-wrong là span rỗng (class "contents") — Playwright coi element
    // rỗng là hidden, nên assert attached (count) + viền đỏ trên container built.
    await expect(page.getByTestId("dict-arrange-wrong")).toHaveCount(1);
    await expect(page.getByTestId("dict-arrange-built")).toHaveClass(/feedback-error/);
  });

  test("variant và auto-pause nhớ localStorage", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("mode-shadow")).toBeVisible(); // studio render xong (client-fetch)
    // phím có thể rơi vào khoảng render → effect gắn listener; retry tới khi dict-box hiện
    await expect(async () => {
      await page.keyboard.press("2");
      await expect(page.getByTestId("dict-box")).toBeVisible();
    }).toPass();
    await page.getByTestId("dict-variant-arrange").click();
    await page.reload();
    await expect(page.getByTestId("mode-shadow")).toBeVisible(); // chờ hydration sau reload
    await expect(async () => {
      await page.keyboard.press("2");
      await expect(page.getByTestId("dict-box")).toBeVisible();
    }).toPass();
    await expect(page.getByTestId("dict-variant-arrange")).toHaveAttribute("aria-pressed", "true");
    // auto-pause chỉ hiện trên video có words
    const ap = page.getByTestId("auto-pause");
    await ap.click();
    await expect(ap).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(ap).toHaveAttribute("aria-pressed", "true");
  });

  test("pron panel render + nút ghi (không cần mic thật)", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("mode-shadow")).toBeVisible();
    await expect(async () => {
      await page.keyboard.press("3");
      await expect(page.getByTestId("pron-zh")).toBeVisible();
    }).toPass();
    await expect(page.getByTestId("pron-record")).toBeVisible();
  });
});
