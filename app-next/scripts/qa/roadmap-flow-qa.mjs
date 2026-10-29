/* Browser QA — roadmap flow (spec 2026-10-28 §9 + Roadmap Journey v2 Task 10).
   15 case hồi quy (điều chỉnh tối thiểu cho drawer 3 tab) + 13 case mới
   journey-start / entry-gate / warm-up / tab Học / học bài thật / topbar /
   đích đến / milestone.
   Run: node roadmap-flow-qa.mjs            → chạy cả 28
        QA_ONLY=16,17 node roadmap-flow-qa.mjs → chạy chọn lọc */
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

/* goto không xoá localStorage (case học bài thật: progress phải còn khi quay lại) */
async function gotoKeep(path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: KILL_ANIM });
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
      .waitForSelector('aside[aria-label="Chi tiết trạm học"][aria-hidden="false"] [data-testid="drawer-tab-study"]', { timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (ok) {
      await finishAnims();
      return true;
    }
  }
  throw new Error("drawer không mở sau 3 lần: " + nodeLabel);
}

/* Câu nghe: cả 2 biến thể (nghe / fallback câu đọc) đều trả lời được qua
   data-correct — variant có thể swap lúc 1.5s nếu TTS phát được → đợi prompt
   ổn định (best-effort fallback + settle) trước khi bấm để tránh race. */
async function waitReadFallback(promptSel) {
  await page
    .waitForFunction(
      (sel) => {
        const t = document.querySelector(sel)?.textContent ?? "";
        return t.length > 0 && !t.includes("🔊") && !/Nghe từ|Nghe và chọn/.test(t);
      },
      promptSel,
      { timeout: 2200 },
    )
    .catch(() => {}); // TTS phát được → giữ câu nghe, vẫn trả lời được
  await page.waitForTimeout(250);
}

/* Station quiz trong drawer: mở tab Bài kiểm tra, trả lời `correct` đúng/tổng. */
async function startStationQuiz(timeout = 20000) {
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout });
}

async function runQuiz(correct) {
  const scope = 'aside[aria-label="Chi tiết trạm học"]';
  const counter = await page.locator(`${scope} [data-testid="quiz-counter"]`).innerText();
  const n = Number(counter.match(/\/(\d+)/)?.[1] ?? 0);
  if (!n) throw new Error("không đọc được tổng câu từ counter: " + counter);
  for (let i = 0; i < n; i++) {
    await waitReadFallback(`${scope} [data-testid="quiz-prompt"]`);
    await eclick(`${scope} [data-correct="${correct}"]`);
    await page.waitForSelector(`${scope} [data-testid="quiz-feedback"]`, { timeout: 5000 });
    const last = i === n - 1;
    await eclick(`${scope} button:has-text("${last ? "Xem kết quả" : "Câu tiếp"}")`);
    if (!last) await page.waitForFunction(
      ([sel, idx, total]) => document.querySelector(sel)?.textContent === `Câu ${idx + 2}/${total}`,
      [`${scope} [data-testid="quiz-counter"]`, i, n],
      { timeout: 5000 },
    );
  }
}

/* EntryGate: bấm "Bắt đầu", trả lời với pattern đúng/sai theo mảng (mặc định all true). */
async function runGate(wrongFirst = 0) {
  const scope = 'aside[aria-label="Chi tiết trạm học"]';
  const counter = await page.locator(`${scope} [data-testid="gate-counter"]`).innerText();
  const n = Number(counter.match(/\/(\d+)/)?.[1] ?? 0);
  if (!n) throw new Error("không đọc được tổng câu gate: " + counter);
  for (let i = 0; i < n; i++) {
    await waitReadFallback(`${scope} [data-testid="gate-prompt"]`);
    const wantCorrect = i >= wrongFirst;
    await eclick(`${scope} [data-testid="gate-option"][data-correct="${wantCorrect}"]`);
    await page.waitForSelector(`${scope} [data-testid="gate-feedback"]`, { timeout: 5000 });
    await eclick(`${scope} button:has-text("${i === n - 1 ? "Xem kết quả" : "Câu tiếp"}")`);
    if (i < n - 1) await page.waitForFunction(
      ([sel, idx, total]) => document.querySelector(sel)?.textContent === `Câu ${idx + 2}/${total}`,
      [`${scope} [data-testid="gate-counter"]`, i, n],
      { timeout: 5000 },
    );
  }
  return n;
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

/* ---------- Case hồi quy 1–15 (điều chỉnh tối thiểu cho drawer 3 tab) ---------- */

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
  await gotoKeep("/roadmap");
  if (!(await page.locator('button[aria-label="Trạm 1: Chào hỏi & Làm quen — đang học"]').count()))
    throw new Error("Trạm 1 không còn active");
});

if (!ONLY || ONLY.includes("4")) await qa("4. Trạm 2 khóa → drawer ĐANG KHÓA (chip) + tab Học vẫn xem được", async () => {
  await gotoApp();
  await openDrawer("Trạm 2: Số đếm & Mua sắm — đang khóa");
  await page.waitForSelector('aside >> text=ĐANG KHÓA · BÀI 2', { timeout: 4000 });
  if (!(await page.locator('aside [data-testid="study-row-0"]').count())) throw new Error("tab Học trống khi locked");
  await page.keyboard.press("Escape");
});

if (!ONLY || ONLY.includes("5")) await qa("5. Drawer Trạm 1: 3 tab — Ôn nhanh empty-note / Học bài 1 / Bài kiểm tra counter", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await page.waitForSelector('aside >> text=Học bài 1', { timeout: 6000 });
  await eclick('aside [data-testid="drawer-tab-review"]');
  await page.waitForSelector('aside >> text=Bắt đầu chặng — không cần ôn.', { timeout: 6000 });
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
});

if (!ONLY || ONLY.includes("6")) await qa("6. Drawer tab Học: link Học bài 1 → /lesson/hsk2/lesson-1", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  const f = await page.locator('aside [data-testid="study-row-0"]').getAttribute("href");
  if (f !== "/lesson/hsk2/lesson-1") throw new Error("study-row-0 href=" + f);
  await page.locator('aside [data-testid="study-row-0"]').click({ force: true });
  await page.waitForURL("**/lesson/hsk2/lesson-1", { timeout: 10000 });
});

if (!ONLY || ONLY.includes("7")) await qa("7. Quiz Trạm 1 sai hết → 0/7, không 🎉", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await startStationQuiz();
  await runQuiz(false);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/0\/7/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 80));
  if (/🎉/.test(txt)) throw new Error("không được có 🎉 khi fail");
});

if (!ONLY || ONLY.includes("8")) await qa("8. Làm lại 7/7 → HOÀN THÀNH TRẠM 1 + Trạm 2 active + store pct 100", async () => {
  await gotoApp();
  await openDrawer("Trạm 1: Chào hỏi & Làm quen — đang học");
  await startStationQuiz();
  await runQuiz(false);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  await eclick('aside button:has-text("Làm lại")');
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 8000 });
  await runQuiz(true);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/7\/7/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 80));
  // chip HOÀN THÀNH hiện khi drawer còn mở (Đóng = unmount nội dung drawer)
  await page.waitForSelector('aside >> text=HOÀN THÀNH · TRẠM 1', { timeout: 8000 });
  await eclick('aside [data-testid="quiz-result"] button:has-text("Đóng")');
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

if (!ONLY || ONLY.includes("9")) await qa("9. Seed 1–5+m done → Trạm 6 ACTIVE + banner 5/13 (38%) + continue lesson-21 + overall 9%", async () => {
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
  if (!/5\/13 bài hoàn thành \(38%\)/.test(banner)) throw new Error("banner=" + banner.replace(/\n/g, " ").slice(0, 90));
  const cont = await page.getByRole("link", { name: "Tiếp tục học →" }).getAttribute("href");
  if (cont !== "/lesson/hsk2/lesson-21") throw new Error("continue href=" + cont);
  const pill = await page.locator('div[aria-label^="Tiến độ toàn lộ trình"]').getAttribute("aria-label");
  // weights: pinyin 8 + hsk1 6 + hsk2 13 + hsk3/4/5 9×3 = 54; hsk2 38% → round(38·13/54)=9%
  if (!/9%/.test(pill)) throw new Error("overall=" + pill);
});

if (!ONLY || ONLY.includes("10")) await qa("10. Milestone active → drawer ĐANG HỌC + quiz 12 câu", async () => {
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
  await startStationQuiz();
  const c = await page.locator('aside [data-testid="quiz-counter"]').innerText();
  if (!/1\/12/.test(c)) throw new Error("counter=" + c);
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

if (!ONLY || ONLY.includes("12")) await qa("12. HSK 1 → roadmap + gate locked; Pinyin → banner Nền tảng; HSK 6 → sắp ra mắt", async () => {
  await gotoApp("/roadmap?level=hsk-1");
  await page.waitForSelector('text=Chặng 1: Giao tiếp thường nhật', { timeout: 8000 });
  const gate = await page.locator('[data-testid="entry-gate-status"]').innerText();
  if (!/Kiểm tra nghe pinyin \(trong trạm 1\)/.test(gate)) throw new Error("gate status=" + gate);
  await gotoApp("/roadmap?level=pinyin");
  await page.waitForSelector('text=Nền tảng: Pinyin & nét cơ bản', { timeout: 8000 });
  if (!(await page.getByRole("link", { name: "Xem lộ trình Pinyin →" }).count())) throw new Error("missing pinyin link");
  await gotoApp("/roadmap?level=hsk-6");
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

/* ---------- Case mới 16–28 (Roadmap Journey v2, Task 10) ---------- */

if (!ONLY || ONLY.includes("16")) await qa("16. 0 progress → journey-start trên banner Pinyin + topbar 0%", async () => {
  await gotoApp("/roadmap?level=pinyin");
  await page.waitForSelector('[data-testid="journey-start"]', { timeout: 8000 });
  if (!(await page.locator('[data-testid="journey-start"]').innerText()).includes("Bắt đầu ở đây")) throw new Error("journey-start text sai");
  if (!(await page.locator('div[aria-label="Tiến độ toàn lộ trình 0%"]').count())) throw new Error("topbar không 0%");
  if (!(await page.locator('aside[data-testid="journey-start"], main [data-testid="journey-start"]').count())) throw new Error("journey-start không render");
});

if (!ONLY || ONLY.includes("17")) await qa("17. journey-start ẨN khi đã có progress (seed station record)", async () => {
  await gotoApp("/roadmap?level=pinyin", { "bye.roadmap.stations.v1": { "hsk-2": { 1: done() } } });
  await page.waitForTimeout(500);
  if (await page.locator('[data-testid="journey-start"]').count()) throw new Error("journey-start vẫn hiện dù overall > 0");
});

if (!ONLY || ONLY.includes("18")) await qa("18. Trạm 1 HSK1 → tab quiz hiện EntryGate 'Kiểm tra đầu vào Pinyin' (gate locked)", async () => {
  await gotoApp("/roadmap?level=hsk-1");
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  await page.waitForSelector('aside >> text=Kiểm tra đầu vào Pinyin', { timeout: 8000 });
  await page.waitForSelector('aside button:has-text("Bắt đầu (12 câu)")', { timeout: 4000 });
  const banner = await page.locator('[data-testid="entry-gate-status"]').innerText();
  if (!/Kiểm tra nghe pinyin/.test(banner)) throw new Error("banner gate status=" + banner);
});

if (!ONLY || ONLY.includes("19")) await qa("19. Gate sai 3/12 (75%) → không pass, 'Chưa đạt', gates store trống", async () => {
  await gotoApp("/roadmap?level=hsk-1");
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  await eclick('aside button:has-text("Bắt đầu (12 câu)")');
  await page.waitForSelector('aside [data-testid="gate-counter"]', { timeout: 8000 });
  await runGate(3); // 3 sai đầu, 9 đúng → 75% < 80%
  await page.waitForSelector('aside [data-testid="gate-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="gate-result"]').innerText();
  if (!/9\/12/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 80));
  if (!/Chưa đạt/.test(txt)) throw new Error("thiếu thông báo làm lại: " + txt.replace(/\n/g, " ").slice(0, 100));
  if (!/Làm lại/.test(txt)) throw new Error("thiếu nút Làm lại");
  const gates = await page.evaluate(() => localStorage.getItem("bye.roadmap.gates.v1"));
  if (gates && gates !== "{}") throw new Error("gates không được ghi khi fail: " + gates);
});

if (!ONLY || ONLY.includes("20")) await qa("20. Gate đúng 10/12 (83%) → pass, gates store ghi, quiz trạm xuất hiện", async () => {
  await gotoApp("/roadmap?level=hsk-1");
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  await eclick('aside button:has-text("Bắt đầu (12 câu)")');
  await page.waitForSelector('aside [data-testid="gate-counter"]', { timeout: 8000 });
  await runGate(2); // 2 sai đầu, 10 đúng → 83%
  // pass → onPass flip drawer sang QuizBody NGAY — gate-result có thể unmount tức thì
  await page.waitForSelector('aside [data-testid="gate-result"], aside [data-testid="quiz-counter"]', { timeout: 8000 });
  const gates = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.roadmap.gates.v1") || "{}"));
  if (gates.hsk1?.pct !== 83) throw new Error("gates=" + JSON.stringify(gates));
  // quiz trạm (generator fetch vocab) xuất hiện
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 25000 });
});

if (!ONLY || ONLY.includes("21")) await qa("21. Seed pinyin 8/8 → gate exempt: banner 'Đã miễn' + quiz tab vào thẳng quiz (không EntryGate)", async () => {
  await gotoApp("/roadmap?level=hsk-1", { "bye.roadmap.pinyin": [1, 2, 3, 4, 5, 6, 7, 8] });
  await page.waitForSelector('[data-testid="entry-gate-status"]', { timeout: 8000 });
  const banner = await page.locator('[data-testid="entry-gate-status"]').innerText();
  if (!/Đã miễn \(Pinyin xong\) ✅/.test(banner)) throw new Error("banner gate status=" + banner);
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  await eclick('aside [data-testid="drawer-tab-quiz"]');
  // exempt → không EntryGate, quiz trạm chạy trực tiếp (8 câu, generator fetch)
  await page.waitForSelector('aside [data-testid="quiz-counter"]', { timeout: 25000 });
  const c = await page.locator('aside [data-testid="quiz-counter"]').innerText();
  if (!/1\/8/.test(c)) throw new Error("quiz không vào thẳng / sai số câu: " + c);
  if (await page.locator('aside button:has-text("Bắt đầu (12 câu)")').count()) throw new Error("EntryGate vẫn chặn khi exempt");
});

if (!ONLY || ONLY.includes("22")) await qa("22. Warm-up trạm 2: 4 câu, xong không đổi station progress", async () => {
  await gotoApp("/roadmap", { "bye.roadmap.stations.v1": { "hsk-2": { 1: done() } } });
  await openDrawer("Trạm 2: Số đếm & Mua sắm — đang học");
  await eclick('aside [data-testid="drawer-tab-review"]');
  await page.waitForSelector('aside [data-testid="warmup-prompt"]', { timeout: 8000 });
  if (!(await page.locator('aside >> text=Ôn 4 từ của').count())) throw new Error("thiếu nhãn warm-up");
  const before = await page.evaluate(() => localStorage.getItem("bye.roadmap.stations.v1"));
  for (let i = 0; i < 4; i++) {
    await eclick('aside [aria-label="warmup-opt-0"]');
    await eclick(`aside button:has-text("${i === 3 ? "Kết thúc ôn" : "Câu tiếp"}")`);
  }
  await page.waitForSelector('aside [data-testid="warmup-done"]', { timeout: 8000 });
  await page.waitForSelector('aside >> text=Không tính điểm — tiến độ không thay đổi.', { timeout: 4000 });
  const after = await page.evaluate(() => localStorage.getItem("bye.roadmap.stations.v1"));
  if (before !== after) throw new Error("stations.v1 bị đổi sau warm-up");
});

if (!ONLY || ONLY.includes("23")) await qa("23. Tab Học trạm 1 HSK1: 5 link /lesson/hsk1/lesson-N + '≈ 40 phút'", async () => {
  await gotoApp("/roadmap?level=hsk-1");
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  if (!(await page.locator('aside [data-testid="drawer-tab-study"]:has-text("≈ 40 phút")').count())) throw new Error("thiếu meta ≈ 40 phút");
  for (let i = 0; i < 5; i++) {
    const href = await page.locator(`aside [data-testid="study-row-${i}"]`).getAttribute("href");
    if (href !== `/lesson/hsk1/lesson-${i + 1}`) throw new Error(`study-row-${i} href=` + href);
  }
  if (!(await page.locator('aside >> text=Mỗi bài ≈ 8 phút').count())) throw new Error("thiếu nhãn 8 phút/bài");
});

if (!ONLY || ONLY.includes("24")) await qa("24. Quiz trạm HSK1 (gate exempt) 100% → toast 🎉 + sao + store", async () => {
  await gotoApp("/roadmap?level=hsk-1", { "bye.roadmap.pinyin": [1, 2, 3, 4, 5, 6, 7, 8] });
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  await startStationQuiz(25000); // fetch vocab 5 bài qua API
  await runQuiz(true);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const toast = await page.waitForSelector('[role="status"]', { timeout: 3000 }).catch(() => null);
  if (!toast || !/🎉 Hoàn thành Trạm 1/.test(await toast.innerText())) throw new Error("thiếu toast pass");
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/🎉/.test(txt) || !/Đạt! Buổi học được đánh dấu hoàn thành/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 100));
  await eclick('aside [data-testid="quiz-result"] button:has-text("Đóng")');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.roadmap.stations.v1") || "{}"));
  if (stored["hsk-1"]?.g1?.pct !== 100 || stored["hsk-1"]?.g1?.stars !== 3) throw new Error("store=" + JSON.stringify(stored["hsk-1"]?.g1));
});

if (!ONLY || ONLY.includes("25")) await qa("25. Học bài thật hsk1/lesson-1 → markPageDone → pct trạm 20% (max với pageDone)", async () => {
  await gotoApp("/lesson/hsk1/lesson-1");
  // flash deck: chờ mount (items fetch API) → reveal + grade 3 đến hết bài
  await page.waitForSelector('[data-od-id="reveal-button"]', { timeout: 25000 });
  let idle = 0;
  for (let i = 0; i < 80; i++) {
    const graded = await page.locator('[data-grade="3"]').isVisible().catch(() => false);
    if (graded) {
      await eclick('[data-grade="3"]');
      idle = 0;
      continue;
    }
    const reveal = await page.locator('[data-od-id="reveal-button"]').isVisible().catch(() => false);
    if (reveal) {
      await eclick('[data-od-id="reveal-button"]');
      idle = 0;
      continue;
    }
    if (++idle >= 5) break; // done — SrsDeck ẩn ổn định
    await page.waitForTimeout(300);
  }
  const pageDone = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.pageDone") || "{}"));
  if (pageDone["hsk1/lesson-1"] !== 1) throw new Error("pageDone=" + JSON.stringify(pageDone));
  await gotoKeep("/roadmap?level=hsk-1");
  await openDrawer("Trạm 1: Chào hỏi & xưng hô — đang học");
  const header = await page.locator('aside p:has-text("hoàn thành")').first().innerText();
  if (!/20% hoàn thành/.test(header)) throw new Error("pct trạm=" + header);
});

if (!ONLY || ONLY.includes("26")) await qa("26. Topbar % tăng khi seed pageDone hsk1", async () => {
  await gotoApp("/roadmap?level=hsk-1", {
    "bye.pageDone": { "hsk1/lesson-1": 1, "hsk1/lesson-2": 1, "hsk1/lesson-3": 1, "hsk1/lesson-4": 1, "hsk1/lesson-5": 1 },
  });
  const pill = await page.locator('div[aria-label^="Tiến độ toàn lộ trình"]').getAttribute("aria-label");
  if (/0%/.test(pill)) throw new Error("overall vẫn 0% sau seed pageDone");
  const m = pill.match(/(\d+)%/);
  if (!m || Number(m[1]) <= 0) throw new Error("overall=" + pill);
});

if (!ONLY || ONLY.includes("27")) await qa("27. Đích đến: HSK 7–9", async () => {
  await gotoApp("/roadmap?level=hsk-7-9");
  await page.waitForSelector('text=Đích đến: HSK 7–9', { timeout: 8000 });
});

if (!ONLY || ONLY.includes("28")) await qa("28. Milestone HSK1: 12 câu, pass ≥80% → state done", async () => {
  await gotoApp("/roadmap?level=hsk-1", {
    "bye.roadmap.pinyin": [1, 2, 3, 4, 5, 6, 7, 8], // gate exempt — quiz tab không bị EntryGate chặn
    "bye.roadmap.stations.v1": { "hsk-1": { g1: done(), g2: done(), g3: done(), g4: done(), g5: done(), g6: done() } },
  });
  const mActive = await page
    .waitForSelector('button[aria-label="Milestone ôn tập chặng — đang học"]', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!mActive) throw new Error("milestone chưa active");
  await openDrawer("Milestone ôn tập chặng — đang học");
  await startStationQuiz(25000); // generator: sample 4 bài + fetch vocab
  await runQuiz(true);
  await page.waitForSelector('aside [data-testid="quiz-result"]', { timeout: 8000 });
  const txt = await page.locator('aside [data-testid="quiz-result"]').innerText();
  if (!/Đạt!/.test(txt)) throw new Error("result=" + txt.replace(/\n/g, " ").slice(0, 100));
  await eclick('aside [data-testid="quiz-result"] button:has-text("Đóng")');
  await page.keyboard.press("Escape");
  await page.waitForSelector('button[aria-label="Milestone ôn tập chặng — hoàn thành"]', { timeout: 8000 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.roadmap.stations.v1") || "{}"));
  if (stored["hsk-1"]?.milestone?.pct !== 100) throw new Error("store=" + JSON.stringify(stored["hsk-1"]?.milestone));
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
