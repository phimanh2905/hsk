import { test, expect, type Page } from "@playwright/test";

/* Wave 5 SM-2 — E2E acceptance (Task 7). Chu kỳ ôn thật qua UI /review:
   seed 1 thẻ review (intervalDays 1, dueAt quá khứ) → phiên ôn reveal + "Nhớ"
   (good) → SM-2 kéo interval 1 → 2 ngày, thẻ rời hàng due sau reload; log
   rating 3 vào bye.review.logs. Chấm lại "Quên" (again) → thẻ rơi bucket
   Yếu (mem < 55), log rating 1. Key dùng vocab thật (hsk1.lesson-1.0 = 你好) để
   buildQueue resolve được qua ContentBridge. */

const KEY = "hsk1.lesson-1.0";
const DAY = 86_400_000;

type Seed = { key: string; dueAt: number; reviewCount: number; intervalDays: number; lastReviewedAt: number };

function seedScript() {
  /* Chạy trong context trang — nhận đủ tham số qua arg của addInitScript,
     KHÔNG tham chiếu scope Node. */
  return (s: Seed) => {
    /* addInitScript chạy lại ở MỌI navigation — chỉ seed lần đầu, giữ lại trạng
       thái đã chấm điểm (recordReview) qua các openReview() sau đó. */
    if (localStorage.getItem("bye.srs.items")) return;
    const now = Date.now();
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({
        [s.key]: {
          key: s.key,
          status: "review",
          dueAt: s.dueAt,
          reviewCount: s.reviewCount,
          lastReviewedAt: s.lastReviewedAt,
          updatedAt: now,
          ease: 2.5,
          intervalDays: s.intervalDays,
          lapses: 0,
        },
      }),
    );
  };
}

async function srsState(page: Page) {
  return page.evaluate(() => ({
    it: JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}")["hsk1.lesson-1.0"],
    logs: JSON.parse(localStorage.getItem("bye.review.logs") ?? "[]"),
  }));
}

/* Tab "HSK 1" — thẻ seed là hsk1.* mà dashboard mặc định mở HSK 2.
   ContentBridge bắn bye:progress sau khi setVocabData → dashboard tự re-render
   khi vocab response về; chỉ cần poll cho tới khi dashboard resolve được thẻ. */
async function openReview(page: Page) {
  const vocab = page.waitForResponse((r) =>
    r.url().includes("/api/v1/content/vocab") && !r.url().includes("vocab-meta") && r.request().method() === "GET"
  );
  await page.goto("/review");
  await vocab;
  await page.getByRole("group", { name: "Lọc cấp độ HSK" }).getByRole("button", { name: "HSK 1" }).click();
  await expect
    .poll(() => page.evaluate(() => document.querySelector("[data-testid=hero-count]")?.textContent), { timeout: 20_000 })
    .toBe("1 từ");
  await expect(page.getByTestId("bucket")).toHaveCount(3);
}

/* Dialog xin phép TTS (chặn overlay z-500) hiện lần đầu khi phiên phát âm thẻ —
   chọn "Dùng giọng hệ thống" nếu xuất hiện, không lỗi nếu không có. */
async function dismissTtsConsent(page: Page) {
  const btn = page.getByRole("button", { name: "Dùng giọng hệ thống" });
  try {
    await btn.waitFor({ state: "visible", timeout: 10_000 });
    await btn.click();
  } catch {
    /* đã đồng ý trước đó / dialog không hiện */
  }
}

test("SM-2 cycle: Nhớ kéo interval + rời hàng due; Quên rơi bucket Yếu; review logs rating 3/1", async ({ page }) => {
  test.setTimeout(180_000);
  const now = Date.now();

  /* ---- Phase 1: thẻ đến hạn, bucket Sâu (mem 80+2=82) ---- */
  await page.addInitScript(seedScript(), {
    key: KEY,
    /* due 2 giờ trước — chưa trôi tròn 1 ngày để memoryStrength không trừ 4/đêm
       (mem = 80 + 2 = 82 → bucket "Đã khắc sâu"). */
    dueAt: now - 2 * 3_600_000,
    reviewCount: 2,
    intervalDays: 1,
    lastReviewedAt: now - 2 * 3_600_000,
  });
  await openReview(page);
  await expect(page.getByTestId("hero-count")).toHaveText("1 từ");
  const start = page.getByTestId("start-session");
  await expect(start).toHaveText(/Bắt đầu ôn tập ngay \(1 từ\)/);
  const jade = page.getByTestId("bucket").filter({ hasText: "Đã khắc sâu" });
  await expect(jade.getByRole("button", { name: "你好" })).toBeVisible();

  /* ---- Phiên ôn: reveal → "Nhớ" (good) ---- */
  await start.click();
  const dialog = page.getByRole("dialog", { name: "Phiên ôn tập" });
  await expect(dialog).toBeVisible();
  await dismissTtsConsent(page);
  await expect(dialog.getByTestId("sess-glyph")).toHaveText("你好");
  await dialog.getByRole("button", { name: "Chạm để xem nghĩa · Space" }).click();
  await expect(dialog.getByTestId("sess-mean")).toBeVisible();
  await dialog.locator('button[data-grade="good"]').click();

  // thẻ duy nhất → phiên tự kết thúc
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Xong phiên ôn: 1/1 từ nhớ tốt")).toBeVisible();

  /* ---- SM-2 sau "Nhớ": review, interval 1 → floor(1 × ease 2.5) = 2 ngày ---- */
  const after = await srsState(page);
  const t1 = Date.now();
  expect(after.it.status).toBe("review");
  expect(after.it.intervalDays).toBe(2);
  expect(after.it.reviewCount).toBe(3);
  expect(after.it.dueAt).toBeGreaterThan(t1 + (1.5 * DAY));
  expect(after.it.lapses).toBe(0);
  expect(after.logs).toHaveLength(1);
  expect(after.logs[0]).toMatchObject({ itemKey: KEY, rating: 3, cardType: "vocab" });
  expect(after.logs[0].durationMs).toBeGreaterThanOrEqual(0);
  expect(after.logs[0].reviewedAt).toBeGreaterThan(now);

  /* ---- Phase 2: reload → dueAt tương lai → không còn hàng due ngay ---- */
  await openReview(page); // tab HSK 1 + tick store (level reset về HSK 2 sau reload)
  await expect(page.getByTestId("start-session")).toHaveText(/Ôn thử tất cả \(1 từ\)/);
  const state2 = await srsState(page);
  expect(state2.it.dueAt).toBeGreaterThan(Date.now() + DAY); // chưa đến hạn

  /* ---- Phase 3: đưa thẻ đến hạn lại → "Quên" (again) ---- */
  await page.evaluate((k: string) => {
    const items = JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}");
    items[k].dueAt = Date.now() - 60_000;
    localStorage.setItem("bye.srs.items", JSON.stringify(items));
  }, KEY);
  await openReview(page);
  await expect(page.getByTestId("start-session")).toHaveText(/Bắt đầu ôn tập ngay \(1 từ\)/);

  await page.getByTestId("start-session").click();
  const dialog2 = page.getByRole("dialog", { name: "Phiên ôn tập" });
  await dismissTtsConsent(page);
  await dialog2.getByRole("button", { name: "Chạm để xem nghĩa · Space" }).click();
  await dialog2.locator('button[data-grade="again"]').click();
  await expect(dialog2).toBeHidden();

  /* SM-2 sau "Quên": relearning, lapses +1, due 10 phút — mem = 45 + 4 = 49 < 55 → bucket Yếu */
  const after2 = await srsState(page);
  const t2 = Date.now();
  expect(after2.it.status).toBe("relearning");
  expect(after2.it.lapses).toBe(1);
  expect(after2.it.intervalDays).toBe(1); // max(1, floor(0.5 × 1))
  expect(after2.it.dueAt).toBeLessThan(t2 + 15 * 60_000);
  expect(after2.logs).toHaveLength(2);
  expect(after2.logs[1]).toMatchObject({ itemKey: KEY, rating: 1, cardType: "vocab" });

  await openReview(page);
  const weak = page.getByTestId("bucket").filter({ hasText: "Yếu · Dễ quên" });
  await expect(weak).toContainText("1 từ");
  await expect(weak.getByRole("button", { name: "你好" })).toBeVisible();
});
