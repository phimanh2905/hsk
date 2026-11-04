import { expect, type Page, test } from "@playwright/test";

/* E2E onboarding + placement (plan 2026-11-04 Task 7): luồng guest trọn vẹn
   trên trang chủ — goal → test ladder / skip → màn kết quả → /roadmap flag + badge.
   Locator option dùng attr trực tiếp: [data-testid="placement-option"][data-correct="…"].

   Sau khi trả lời đủ câu, màn kết quả "Bạn nên bắt đầu từ …" phải hiển thị
   (onboarding-result) cho đến khi user tự click "Vào Journey" (onboarding-start-journey). */

// /roadmap render 1 chặng/lần theo ?level= (default hsk-2) — banner pinyin cần ?level=pinyin.
function roadmapUrl(level?: string) {
  return level ? `/roadmap?level=${level}` : "/roadmap";
}

// Trả lời 1 câu test placement: `correct` chọn đúng/sai. Chờ câu tiếp theo render
// (progress "Câu N/15" tăng); câu cuối → chờ hero swap (xem note bug ở đầu file).
async function answerPlacement(page: Page, correct: boolean, last = false) {
  const progress = page.getByTestId("placement-progress");
  let n = 0;
  if (!last) {
    // Chờ progress render "Câu N/15" TRƯỚC khi đọc số, tránh race Number(...) = 0
    // (P2.11: textContent() có thể chạy trước khi câu hiện tại render xong).
    await expect(progress).toHaveText(/Câu \d+\/15/);
    const before = await progress.textContent();
    n = Number(before?.match(/Câu (\d+)\/15/)?.[1] ?? 0);
  }
  await page
    .locator(`[data-testid="placement-option"][data-correct="${correct ? "true" : "false"}"]`)
    .first()
    .click();
  if (last) {
    await expect(page.getByTestId("onboarding-result")).toBeVisible();
  } else {
    await expect(progress).toContainText(`Câu ${n + 1}/15`);
  }
}

test.describe("Onboarding + placement", () => {
  test("guest: goal → test ladder pass hết → journey cờ ở hsk5 + badge bỏ qua", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-hero")).toBeVisible();
    await expect(page.getByTestId("landing-intro")).toBeVisible();

    // Bước 1: goal + minutes
    await page.getByTestId("onboarding-goal-hsk5").click();
    await page.getByTestId("onboarding-minutes-15").click();
    await page.getByTestId("onboarding-next").click();

    // Bước 2 → làm test
    await page.getByTestId("onboarding-take-test").click();

    // Trả lời đúng hết 15 câu → màn kết quả "HSK 5"
    for (let i = 0; i < 15; i++) {
      await answerPlacement(page, true, i === 14);
    }
    await expect(page.getByTestId("onboarding-result")).toContainText("HSK 5");

    // Vào Journey (placement đã lưu) — cờ ở banner hsk-5
    await page.getByTestId("onboarding-start-journey").click();
    await page.waitForURL(/\/roadmap/);
    await page.goto(roadmapUrl("hsk-5"));
    await expect(page.getByTestId("journey-start")).toBeVisible();

    // Badge bỏ qua ở trạm thấp hơn (banner hsk-1; pinyin banner không có badge)
    await page.goto(roadmapUrl("hsk-1"));
    await expect(page.getByTestId("skippable-badge")).toBeVisible();

    // Absence checks (P2.11): cờ đã chuyển sang hsk-5 sau khi pass hết
    await page.goto(roadmapUrl("pinyin"));
    await expect(page.getByTestId("journey-start")).toHaveCount(0); // không còn journey ở pinyin
    await page.goto(roadmapUrl("hsk-2"));
    await expect(page.getByTestId("skippable-badge")).toHaveCount(0); // hsk-2 == suggested → không badge
    await page.goto(roadmapUrl("hsk-5"));
    await expect(page.getByTestId("skippable-badge")).toHaveCount(0); // trạm suggested / trên suggested không có badge
  });

  test("skip-only: goal → bỏ qua test → cờ vẫn ở pinyin", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("onboarding-hero").waitFor();
    await page.getByTestId("onboarding-goal-hsk2").click();
    await page.getByTestId("onboarding-minutes-10").click();
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-skip-test").click();
    await page.goto(roadmapUrl("pinyin"));
    await expect(page.getByTestId("journey-start")).toBeVisible(); // banner pinyin
  });

  test("ladder fail hsk1 → suggested pinyin, không badge", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("onboarding-hero").waitFor();
    await page.getByTestId("onboarding-goal-hsk5").click();
    await page.getByTestId("onboarding-minutes-15").click();
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-take-test").click();
    // 1 đúng, 2 sai → block hsk1 fail (< 2/3 đúng), ladder dừng
    await answerPlacement(page, true);
    await answerPlacement(page, false);
    await answerPlacement(page, false, true);
    await expect(page.getByTestId("onboarding-result")).toContainText("Pinyin");

    // Vào Journey — cờ ở banner pinyin; không banner nào có badge "Bỏ qua được"
    await page.getByTestId("onboarding-start-journey").click();
    await page.waitForURL(/\/roadmap/);
    await page.goto(roadmapUrl("pinyin"));
    await expect(page.getByTestId("journey-start")).toBeVisible();
    await expect(page.getByTestId("skippable-badge")).toHaveCount(0);
  });
});
