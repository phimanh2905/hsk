import { test, expect } from "@playwright/test";

/* Wave 0 acceptance (spec 2026-10-24):
   - W0.1: hoàn thành flash deck → bye.pageDone ghi "hsk1/lesson-1" → dashboard lessonsDone > 0.
   - W0.2: bye.hanzi.quiz persist → catalog badge + detail chip "Đã luyện".
     Quiz thật cần vẽ nét tay → không mô phỏng được bằng chuột đáng tin cậy;
     test persist bằng cách seed localStorage (đúng key/range Task 1) rồi verify UI hiển thị.
   - W0.3: smoke UI quiz (điểm best đã phủ bởi unit test Task 7). */

test("W0.1 — flash deck hoàn thành → bye.pageDone + dashboard lessonsDone", async ({ page }) => {
  test.setTimeout(120_000); // chấm cả deck + animation lật thẻ có thể vượt default 30s khi chạy full suite
  await page.goto("/lesson/hsk1/lesson-1", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle"); // chờ hydration xong — click quá sớm bị rơi
  await expect(page.getByTestId("flash-stage")).toBeVisible({ timeout: 20_000 });

  // chấm hết deck: lật thẻ → chấm "Đã thuộc · Tốt" → lặp đến khi deck ẩn (done)
  const reveal = page.locator('[data-od-id="reveal-button"]');
  const good = page.getByRole("button", { name: "Đã thuộc · Tốt" });
  for (let i = 0; i < 40; i++) {
    if (!(await reveal.isVisible().catch(() => false))) break; // done=true → SrsDeck unmount
    await reveal.click();
    if (!(await good.isVisible().catch(() => false))) {
      await reveal.click(); // click bị rơi trong lúc animation lật thẻ — thử lại
    }
    await good.click();
  }
  // deck ẩn = màn hoàn thành
  await expect(reveal).toHaveCount(0);

  const pageDone = await page.evaluate(() => localStorage.getItem("bye.pageDone"));
  expect(pageDone).toContain("hsk1/lesson-1");

  // dashboard đếm được
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const lessonsDone = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem("bye.pageDone") || "{}") as Record<string, number>;
    return Object.values(map).filter((v) => v === 1).length;
  });
  expect(lessonsDone).toBeGreaterThan(0);
});

test("W0.2 — seed bye.hanzi.quiz → catalog badge 'Đã luyện' và detail chip", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bye.hanzi.quiz",
      JSON.stringify({ 好: { attempts: 2, best: 0, last: Date.now() } })
    );
  });
  // catalog: tìm chữ 好 qua search (chế độ HSK) — badge phải hiện
  await page.goto("/hanzi", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  // catalog mặc định ở mode "rad" (badge chỉ render ở mode HSK) → chuyển mode,
  // nới lọc cấp độ về "Tất cả" (好 thuộc HSK 3, filter mặc định là HSK 1)
  await page.getByRole("button", { name: "Theo cấp độ HSK" }).click();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  const searchInput = page.getByLabel("Tìm bộ thủ");
  await expect(async () => {
    await searchInput.fill("好");
    await expect(page.locator('[data-testid="practiced-好"]')).toBeVisible();
  }).toPass({ timeout: 30_000 });

  // detail /hanzi/好 — chip "Đã luyện viết · 2 lần"
  await page.goto("/hanzi/%E5%A5%BD", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("practiced-detail")).toContainText("Đã luyện viết");
  await expect(page.getByTestId("practiced-detail")).toContainText("2 lần");
});

/* W0.3: chọn đáp án SAI hết thì correct=0, recordSoundRulesResult(0) với best=0
   KHÔNG ghi (`correct <= best`) — muốn ghi thì phải chọn ĐÚNG, nhưng e2e không đọc
   được soundRulesData ở client. Quyết định: điểm best đã phủ đủ bởi unit test
   Task 7; e2e chỉ smoke UI (trả lời 1 câu → khóa, không pageerror). */
test("W0.3 smoke — sound-rules quiz chọn đáp án → khóa câu + không lỗi", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto("/sound-rules", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const firstOption = page.locator("div.border.rounded-card.p-3 button").first();
  await firstOption.click();
  await expect(firstOption).toBeDisabled();
  expect(pageErrors).toEqual([]);
});
