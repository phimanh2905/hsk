/* Browser QA — roadmap flow Hướng B (spec 2026-10-28 §9, 15 cases). FINAL
   Run: node roadmap-qa.mjs            → chạy cả 15
        QA_ONLY=7,8 node roadmap-qa.mjs → chạy chọn lọc */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3101";
const ONLY = process.env.QA_ONLY ? process.env.QA_ONLY.split(",") : null;
const results = [];
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let page = await ctx.newPage();
page.setDefaultTimeout(15000);

const KILL_ANIM = "*,*::before,*::after{transition-duration:0s !important;animation-duration:0s !important}";
const eclick = (sel) => page.locator(sel).first().evaluate((el) => el.click());
const done = () => ({ pct: 100, stars: 3 });

async function newPage() {
  await page.close().catch(() => {});
  page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 120)));
}

async function gotoApp(path = "/roadmap", seed = null) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: KILL_ANIM });
  await page.evaluate(() => localStorage.clear());
  if (seed) {
    await page.evaluate((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
    }, seed);
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: KILL_ANIM });
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700);
}

async function finishAnims() {
  await page.evaluate(() => document.querySelectorAll("aside, main").forEach((el) => el.getAnimations().forEach((a) => a.finish())));
}

async function openDrawer(nodeLabel) {
  for (let i = 0; i < 3; i++) {
    await page.locator(`button[aria-label="${nodeLabel}"]`).click({ force: true });
    const ok = await page
      .waitForSelector('aside[aria-label="Chi tiết trạm học"] >> text=Từ vựng mới', { timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (ok) {
      await finishAnims();
      return true;
    }
  }
  throw new Error("drawer không mở sau 3 lần: " + nodeLabel);
}

async function runQuiz(correct) {
  const scope = 'aside[aria-label="Chi tiết trạm học"]';
  const counter = await page.locator(`${scope} [data-testid="quiz-counter"]`).innerText();
  const n = Number(counter.match(/\/(\d+)/)?.[1] ?? 0);
  if (!n) throw new Error("không đọc được tổng câu từ counter: " + counter);
  for (let i = 0; i < n; i++) {
    await eclick(`${scope} [data-correct="${correct}"]`);
    const last = i === n - 1;
    await eclick(`${scope} button:has-text("${last ? "Xem kết quả" : "Câu tiếp"}")`);
  }
}

async function qa(name, fn) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fn();
      results.push(["PASS", name]);
      await newPage();
      return;
    } catch (e) {
      const detail = String(e.message).split("\n").slice(0, 4).join(" | ").slice(0, 300);
      if (attempt === 2) {
        results.push(["FAIL", name + " — " + detail]);
        await newPage();
      }
    }
  }
}

if (!ONLY || ONLY.includes("1")) await qa("1. /roadmap load — banner + trạm + topbar overall + review card + Tiếp tục học", async () => {
  await gotoApp();
  if (!(await page.getByText("Chặng 1: Giao tiếp thường nhật").count())) throw new Error("missing banner title");
  if (!(await page.locator('div[aria-label="Tiến độ toàn lộ trình 0%"]').count())) throw new Error("missing overall pill");
  if (!(await page.getByText("Tổng ôn").count())) throw new Error("missing review card");
  const cont = await page.getByRole("link", { name: "Tiếp tục học →" }).getAttribute("href");
  if (cont !== "/lesson/hsk2/lesson-1") throw new Error("continue href=" + cont);
  if (!(await page.locator('button[aria-label="Trạm 6: Thời tiết & Bốn mùa — đang khóa"]').count())) throw new Error("missing Trạm 6 node");
  if (!(await page.locator('button[aria-label="Milestone ôn tập chặng — đang khóa"]').count())) throw new Error("missing milestone node");
});

if (!ONLY || ONLY.includes("2")) await qa("2. Vào bài học → /lesson/hsk2/lesson-1", async () => {
  await gotoApp();
  await page.getByRole("button", { name: "Vào bài học" }).click({ force: true });
  await page.waitForURL("**/lesson/hsk2/lesson-1", { timeout: 10000 });
});

if (!ONLY || ONLY.includes("3")) await qa("3. Back → /roadmap, Trạm 1 vẫn active", async () => {
  await gotoApp();
  await page.getByRole("button", { name: "Vào bài học" }).click({ force: true });
  await page.waitForURL("**/lesson/hsk2/lesson-1", { timeout: 10000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await gotoApp();
  if (!(await page.locator('button[aria-label="Trạm 1: Chào hỏi & Làm quen — đang học"]').count()))
    throw new Error("Trạm 1 không còn active");
});

if (!ONLY || ONLY.includes("4")) await qa("4. Trạm 2 khóa → drawer ĐANG KHÓA, quiz disabled", async () => {
  await gotoApp();
  await openDrawer("Trạm 2: Số đếm & Mua sắm — đang khóa");
  await page.waitForSelector('aside >> text=ĐANG KHÓA', { timeout: 4000 });
  if (await page.locator('aside button:has-text("Thi trắc nghiệm Quiz")').isEnabled()) throw new Error("quiz enabled khi locked");
  await page.keyboard.press("Escape");
});

if (!ONLY || ONLY.includes("5")) await qa("5. Drawer Trạm 1: tabs + TTS click không crash", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await page.locator('aside button[aria-label="Nghe phát âm 你好"]').click({ force: true });
  await eclick('aside button:has-text("Ngữ pháp trọng tâm")');
  await page.waitForSelector('aside >> text=Câu chào + tên', { timeout: 6000 });
  await eclick('aside button:has-text("Từ vựng mới")');
  await page.waitForSelector('aside >> text=xin chào', { timeout: 6000 });
});

if (!ONLY || ONLY.includes("6")) await qa("6. Drawer: Học Flashcard → lesson-1; Luyện viết Hanzi → /hanzi", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  const f = await page.locator('aside a:has-text("Học Flashcard")').getAttribute("href");
  if (f !== "/lesson/hsk2/lesson-1") throw new Error("flashcard href=" + f);
  const h = await page.locator('aside a:has-text("Luyện viết Hanzi")').getAttribute("href");
  if (h !== "/hanzi") throw new Error("hanzi href=" + h);
  await page.locator('aside a:has-text("Học Flashcard")').click({ force: true });
  await page.waitForURL("**/lesson/hsk2/lesson-1", { timeout: 10000 });
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await page.locator('aside a:has-text("Luyện viết Hanzi")').click({ force: true });
  await page.waitForURL("**/hanzi", { timeout: 10000 });
});

if (!ONLY || ONLY.includes("7")) await qa("7. Quiz Trạm 1 sai hết → 0/7, không 🎉", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await page.waitForSelector('aside >> text=Thi trắc nghiệm Quiz', { timeout: 8000 });
  await eclick('aside button:has-text("Thi trắc nghiệm Quiz")');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
  await runQuiz(false);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/0\/7/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 80));
  if (/🎉/.test(txt)) throw new Error("không được có 🎉 khi fail");
});

if (!ONLY || ONLY.includes("8")) await qa("8. Làm lại 7/7 → HOÀN THÀNH TRẠM 1 + Trạm 2 active + store pct 100", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await page.waitForSelector('aside >> text=Thi trắc nghiệm Quiz', { timeout: 8000 });
  await eclick('aside button:has-text("Thi trắc nghiệm Quiz")');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
  await runQuiz(false);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  await eclick('aside button:has-text("Làm lại")');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
  await runQuiz(true);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/7\/7/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 80));
  await eclick('aside [data-testid="quiz-result"] button:has-text("Đóng")');
  await page.waitForSelector('aside >> text=HOÀN THÀNH · TRẠM 1', { timeout: 8000 });
  await page.keyboard.press("Escape");
  await page.waitForSelector('button[aria-label="Trạm 2: Số đếm & Mua sắm — đang học"]', { timeout: 8000 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.roadmap.stations.v1") || "{}"));
  if (stored["hsk-2"]?.["1"]?.pct !== 100) throw new Error("store=" + JSON.stringify(stored["hsk-2"]?.["1"]));
});

if (!ONLY || ONLY.includes("15")) await qa("15. Reload → progress Trạm 1 giữ, Trạm 2 active", async () => {
  await gotoApp("/roadmap", { "bye.roadmap.stations.v1": { "hsk-2": { 1: done() } } });
  const t2 = await page
    .waitForSelector('button[aria-label="Trạm 2: Số đếm & Mua sắm — đang học"]', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!t2) throw new Error("Trạm 2 không active sau reload (seed Trạm 1 done)");
  if (!(await page.locator('button[aria-label="Trạm 1: Chào hỏi & Làm quen — đang học"]').count()) &&
      !(await page.locator('button[aria-label="Trạm 1: Chào hỏi & Làm quen — hoàn thành"]').count()))
    throw new Error("node Trạm 1 biến mất");
});

if (!ONLY || ONLY.includes("9")) await qa("9. Seed 1–5+m done → Trạm 6 ACTIVE + banner 5/6 + continue lesson-21 + overall 42%", async () => {
  await gotoApp("/roadmap", {
    "bye.roadmap.stations.v1": {
      "hsk-2": { 1: done(), 2: done(), 3: done(), 4: done(), 5: done(), m: { pct: 80, stars: 1 } },
    },
  });
  const t6 = await page
    .waitForSelector('button[aria-label="Trạm 6: Thời tiết & Bốn mùa — đang học"]', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!t6) throw new Error("Trạm 6 chưa active");
  const banner = await page.locator("section[aria-label^='Tiến độ Chặng']").first().innerText();
  if (!/5\/6 bài/.test(banner)) throw new Error("banner=" + banner.replace(/\n/g, " ").slice(0, 90));
  const cont = await page.getByRole("link", { name: "Tiếp tục học →" }).getAttribute("href");
  if (cont !== "/lesson/hsk2/lesson-21") throw new Error("continue href=" + cont);
  const pill = await page.locator('div[aria-label^="Tiến độ toàn lộ trình"]').getAttribute("aria-label");
  if (!/42%/.test(pill)) throw new Error("overall=" + pill);
});

if (!ONLY || ONLY.includes("10")) await qa("10. Milestone active → drawer ĐANG HỌC + quiz 10 câu", async () => {
  await gotoApp("/roadmap", {
    "bye.roadmap.stations.v1": { "hsk-2": { 1: done(), 2: done(), 3: done(), 4: done(), 5: done() } },
  });
  const mActive = await page
    .waitForSelector('button[aria-label="Milestone ôn tập chặng — đang học"]', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!mActive) throw new Error("milestone chưa active");
  await openDrawer("Milestone ôn tập chặng — đang học");
  await page.waitForSelector('aside >> text=ĐANG HỌC · MILESTONE', { timeout: 8000 });
  await eclick('aside button:has-text("Thi trắc nghiệm Quiz")');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
  const c = await page.locator('aside [data-testid="quiz-counter"]').innerText();
  if (!/1\/10/.test(c)) throw new Error("counter=" + c);
});

if (!ONLY || ONLY.includes("11")) await qa("11. Badge '2 thẻ đến hạn' + card → /review", async () => {
  await gotoApp("/roadmap", {
    "bye.srs.items": {
      a: { key: "a", status: "review", ease: 2.5, intervalDays: 1, lapses: 0, dueAt: Date.now() - 1000, reviewCount: 1, lastReviewedAt: 1, updatedAt: 1 },
      b: { key: "b", status: "learning", ease: 2.5, intervalDays: 0, lapses: 0, dueAt: Date.now() - 2000, reviewCount: 1, lastReviewedAt: 1, updatedAt: 1 },
      c: { key: "c", status: "review", ease: 2.5, intervalDays: 3, lapses: 0, dueAt: Date.now() + 86400000, reviewCount: 1, lastReviewedAt: 1, updatedAt: 1 },
      d: { key: "d", status: "new", ease: 2.5, intervalDays: 0, lapses: 0, dueAt: Date.now() - 3000, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 },
    },
  });
  await page.waitForSelector('[data-testid="review-due"]', { timeout: 8000 });
  const badge = await page.locator('[data-testid="review-due"]').innerText();
  if (!/2 thẻ đến hạn/.test(badge)) throw new Error("badge=" + badge);
  await page.locator('a[aria-label^="Ôn tập ngắt quãng"]').click({ force: true });
  await page.waitForURL("**/review", { timeout: 10000 });
});

if (!ONLY || ONLY.includes("12")) await qa("12. HSK 1 → banner Pinyin + link; HSK 3 → sắp ra mắt", async () => {
  await gotoApp();
  await page.locator('div[role="group"][aria-label="Chọn cấp độ HSK"] button:has-text("HSK 1")').click({ force: true });
  await page.waitForURL("**/roadmap?level=hsk-1", { timeout: 10000 });
  await page.waitForSelector('text=Nền tảng: Pinyin & nét cơ bản', { timeout: 8000 });
  if (!(await page.getByRole("link", { name: "Xem lộ trình Pinyin →" }).count())) throw new Error("missing pinyin link");
  await gotoApp("/roadmap?level=hsk-3");
  await page.waitForSelector('text=sắp ra mắt', { timeout: 8000 });
});

if (!ONLY || ONLY.includes("13")) await qa("13. Seed 1–5 done → milestone active, banner hợp lệ", async () => {
  await gotoApp("/roadmap", {
    "bye.roadmap.stations.v1": { "hsk-2": { 1: done(), 2: done(), 3: done(), 4: done(), 5: done() } },
  });
  const mActive = await page
    .waitForSelector('button[aria-label="Milestone ôn tập chặng — đang học"]', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!mActive) throw new Error("milestone chưa active");
  const banner = await page.locator("section[aria-label^='Tiến độ Chặng']").first().innerText();
  if (!/Trạm hiện tại|Còn 0 bài/.test(banner)) throw new Error("banner=" + banner.replace(/\n/g, " ").slice(0, 100));
  // ruling: milestone active → activeView (lọc kind lesson) null → không có link Tiếp tục học
  const contCount = await page.getByRole("link", { name: "Tiếp tục học →" }).count();
  if (contCount > 0) {
    const cont = await page.getByRole("link", { name: "Tiếp tục học →" }).getAttribute("href");
    if (cont !== "/course/hsk2") throw new Error("continue href=" + cont);
  }
});

if (!ONLY || ONLY.includes("14")) await qa("14. Mobile 390×844: không tràn ngang, drawer full-width", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error("overflow-x=" + overflow + "px");
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  const w = await page.locator('aside[aria-label="Chi tiết trạm học"]').evaluate((el) => el.offsetWidth);
  if (w < 380) throw new Error("drawer width=" + w);
  await page.setViewportSize({ width: 1280, height: 900 });
});

await browser.close();
console.log("=== KẾT QUẢ QA ===");
for (const [s, n] of results) console.log(s + "  " + n);
const fails = results.filter(([s]) => s === "FAIL").length;
console.log(`\n${results.length - fails}/${results.length} PASS`);
if (errors.length) {
  console.log("PAGE ERRORS:");
  for (const e of errors) console.log("  " + e);
}
process.exit(fails ? 1 : 0);
