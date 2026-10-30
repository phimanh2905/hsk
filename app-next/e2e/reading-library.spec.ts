import { expect, test, type Page } from "@playwright/test";

/* E2E thư viện reading (Task 10, plan 2026-10-30-reading-library).
   Data thật từ D1 hsk-dev (15 bài content_readings, audio null → fallback TTS).
   Test KHÔNG play audio (tránh TTS): chỉ assert render + toggle + quiz chọn đáp án.
   Doc thật lấy qua API để assert đúng text/đáp án thay vì hard-code seed. */

test.use({ storageState: { cookies: [], origins: [] } }); // guest

type ReadingDoc = {
  id: string;
  level: string;
  title: string;
  titleVi: string;
  sentences: { zh: string; py: string; vi: string }[];
  questions: { q: string; qVi: string; options: string[]; answer: number; evidence?: unknown[] }[];
};

async function fetchDocs(request: import("@playwright/test").APIRequestContext): Promise<ReadingDoc[]> {
  const res = await request.get("/api/v1/content/readings");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as ReadingDoc[];
}

/** Mở /reading và chờ grid render xong (compile lạnh lần đầu cần timeout rộng). */
async function openLibrary(page: Page): Promise<ReadingDoc[]> {
  await page.goto("/reading");
  await expect(page.getByRole("heading", { name: "Bài đọc", exact: true })).toBeVisible({ timeout: 30_000 });
  // Chờ data fetch xong: skeleton ẩn đi, section level đầu tiên hiện.
  await expect(page.getByRole("heading", { name: /HSK \d+ \(\d+ bài\)/ }).first()).toBeVisible({
    timeout: 30_000,
  });
  return fetchDocs(page.request);
}

test.describe("Reading library", () => {
  test("mở /reading thấy tabs level + section + card title tiếng Trung", async ({ page }) => {
    const docs = await openLibrary(page);
    expect(docs.length).toBeGreaterThan(0);
    // Tabs: Tất cả + HSK 1..5
    const nav = page.getByRole("navigation", { name: "Chọn level" });
    await expect(nav.getByRole("button", { name: "Tất cả" })).toBeVisible();
    for (let i = 1; i <= 5; i++) {
      await expect(nav.getByRole("button", { name: `HSK ${i}` })).toBeVisible();
    }
    // Ít nhất 1 section + 1 card có title tiếng Trung
    const firstDoc = docs[0];
    const card = page.getByRole("button").filter({ hasText: firstDoc.title }).first();
    await expect(card).toBeVisible();
    await expect(card.locator(".zh")).toContainText(/[\u4e00-\u9fff]/);
  });

  test("mở bài: câu render từ API + nút về danh sách; toggle pinyin và dịch", async ({ page }) => {
    const docs = await openLibrary(page);
    const doc = docs[0];
    await page.getByRole("button").filter({ hasText: doc.title }).first().click();

    // View bài: nút quay lại + câu đầu khớp text API
    await expect(page.getByRole("button", { name: "← Danh sách" })).toBeVisible({ timeout: 30_000 });
    const sentence0 = page.locator('[data-sentence="0"]');
    await expect(sentence0).toContainText(doc.sentences[0].zh);

    // Toggle Pinyin: chọn câu 0 (py không rỗng trong seed) — hàng pinyin là sibling phía trước [data-sentence]
    expect(doc.sentences[0].py.length).toBeGreaterThan(0);
    const pyRow = sentence0.locator("xpath=preceding-sibling::span[1]");
    await expect(pyRow).toHaveCount(0);
    await page.getByRole("button", { name: "拼 Pinyin" }).click();
    await expect(pyRow).toHaveText(doc.sentences[0].py);
    await page.getByRole("button", { name: "拼 Pinyin" }).click();
    await expect(pyRow).toHaveCount(0);

    // Toggle Dịch: dòng dịch hiện dưới câu (sibling phía sau)
    const viRow = sentence0.locator("xpath=following-sibling::span[1]");
    await expect(viRow).toHaveCount(0);
    await page.getByRole("button", { name: "Dịch", exact: true }).click();
    await expect(viRow).toContainText(doc.sentences[0].vi);
    await page.getByRole("button", { name: "Dịch", exact: true }).click();
    await expect(viRow).toHaveCount(0);
  });

  test("quiz: chọn đáp án → tô đúng/sai; trả hết câu hỏi → reload còn badge Done", async ({ page }) => {
    const docs = await openLibrary(page);
    const doc = docs[0];
    const hasEvidence = doc.questions.some((q) => (q.evidence?.length ?? 0) > 0);

    await page.getByRole("button").filter({ hasText: doc.title }).first().click();
    await expect(page.getByRole("button", { name: "← Danh sách" })).toBeVisible({ timeout: 30_000 });

    // Câu 0: chọn đáp án SAI trước → sai tô rose-wash + đáp án đúng tô jade-wash
    const q0 = doc.questions[0];
    const q0card = page.getByTestId("question-0");
    const wrongIdx = q0.options.findIndex((_, i) => i !== q0.answer);
    const wrongBtn = q0card.getByRole("button", { name: q0.options[wrongIdx] });
    const rightBtn0 = q0card.getByRole("button", { name: q0.options[q0.answer] });
    await wrongBtn.click();
    await expect(wrongBtn).toHaveClass(/bg-rose-wash/);
    await expect(rightBtn0).toHaveClass(/bg-jade-wash/);
    // Evidence (nếu seed có): mark data-evidence xuất hiện khi câu được trả lời
    if (q0.evidence?.length) {
      await expect(page.getByTestId("evidence-mark").first()).toBeVisible();
    }

    // Trả lời các câu còn lại bằng đáp án đúng từ API → option đúng tô jade-wash
    for (let qi = 1; qi < doc.questions.length; qi++) {
      const q = doc.questions[qi];
      const right = page.getByTestId(`question-${qi}`).getByRole("button", { name: q.options[q.answer] });
      await right.click();
      await expect(right).toHaveClass(/bg-jade-wash/);
    }
    if (!hasEvidence) {
      // Seed hiện tại không có evidence — assert không có mark lộ ra ngoài mong đợi
      await expect(page.getByTestId("evidence-mark")).toHaveCount(0);
    }

    // Reload → card của bài này có badge Done
    await page.goto("/reading");
    const card = page.getByRole("button").filter({ hasText: doc.title }).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText("Done");

    // Mở lại bài → đáp án đã chọn được reset component-side (progress chỉ lưu Done) —
    // chỉ assert badge tồn tại là đủ acceptance; mở bài để xác nhận progress không phá render.
    await card.click();
    await expect(page.locator('[data-sentence="0"]')).toBeVisible({ timeout: 30_000 });
  });
});
