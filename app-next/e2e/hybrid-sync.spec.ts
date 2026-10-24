import { test, expect } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/* Wave 4 HybridStore — E2E 2-session (Task 7).
   Scenario: guest (context A) học → dữ liệu nằm localStorage; "login" (gắn
   session cookie better-auth) → merge-push POST /api/v1/sync; context B (session
   cùng user) load → pull dữ liệu A; B chỉnh data → A reload thấy merge (không mất mốc).

   Session thật không cần Google: tạo user + session row trong D1 dev (`hsk-dev`,
   remote — dev server binding `remote: true` theo wrangler.dev.jsonc) rồi KÝ
   cookie `better-auth.session_token` từ token: HMAC-SHA256(token, secret) →
   base64, cookie value = encodeURIComponent(`${token}.${sig}`) (đúng
   signCookieValue của better-call, xác minh với better-auth 1.7.7). */

function readDevSecret(): string {
  const envPath = path.join(process.cwd(), ".env.local");
  const line = readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith("BETTER_AUTH_SECRET="));
  if (!line) throw new Error("BETTER_AUTH_SECRET không tìm thấy trong .env.local");
  return line.slice("BETTER_AUTH_SECRET=".length).trim();
}

function signSessionToken(token: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(token).digest("base64");
  return encodeURIComponent(`${token}.${sig}`);
}

function d1Run(sql: string): void {
  execFileSync("pnpm", [
    "wrangler", "d1", "execute", "hsk-dev", "--remote", "--config", "wrangler.dev.jsonc",
    "--command", sql, "--json",
  ], { stdio: "ignore", timeout: 120_000 });
}

let USER_ID = "";
let SESSION_TOKEN = "";

test.beforeAll(() => {
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  USER_ID = `e2e-hybrid-${suffix}`;
  SESSION_TOKEN = randomBytes(24).toString("hex");
  const future = "strftime('%s','now')+86400";
  d1Run(
    `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt) ` +
      `VALUES ('${USER_ID}', 'E2E Hybrid', '${USER_ID}@test.local', 1, NULL, unixepoch(), unixepoch());` +
      `INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId, ipAddress, userAgent) ` +
      `VALUES ('e2e-sess-${suffix}', ${future}, '${SESSION_TOKEN}', unixepoch(), unixepoch(), '${USER_ID}', NULL, 'e2e');`
  );
});

function sessionCookie() {
  return {
    name: "better-auth.session_token",
    value: signSessionToken(SESSION_TOKEN, readDevSecret()),
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}

const SYNC_URL = "/api/v1/sync";
const isSyncPost = (r: { url(): string; request(): { method(): string } }) =>
  r.url().includes(SYNC_URL) && r.request().method() === "POST";

test("hybrid sync: guest học → login push → session 2 pull → 2 chiều không mất dữ liệu", async ({ browser }) => {
  test.setTimeout(180_000);
  // ngày VN (Asia/Ho_Chi_Minh) khớp vnDay của app — UTC sẽ lệch từ 17:00 VN
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  /* ---- Context A (guest): học 1 thẻ + cộng 1 XP ---- */
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto("/lesson/hsk1/lesson-1");

  // pinyin của thẻ đầu (hiển thị trên flashcard) — dùng để trả lời đúng quiz
  const py = await pageA.evaluate(() =>
    document
      .querySelector('article[data-od-id="flashcard"] .text-\\[21px\\]')
      ?.textContent?.trim()
  );
  expect(py).toBeTruthy();

  // thêm SRS item (star từ đầu tiên trong word list) → bye.srs.items
  await pageA.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" }).first().click();
  await expect(pageA.getByText("Đã thêm vào ôn tập")).toBeVisible();

  // +1 XP qua quiz (chọn đúng pinyin) → bye.heat
  await pageA.locator('[data-mode="quiz"]').click();
  await expect(pageA.getByText("Chọn cách đọc đúng")).toBeVisible();
  await pageA.locator(`button[data-py="${py}"]`).click();
  await expect(pageA.getByText("+1 XP")).toBeVisible();

  const localA = await pageA.evaluate(() => ({
    srs: JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}"),
    heat: JSON.parse(localStorage.getItem("bye.heat") ?? "{}"),
  }));
  const srsKey = Object.keys(localA.srs)[0];
  expect(srsKey).toBeTruthy();
  expect((localA.heat[today] ?? 0)).toBe(1);

  /* ---- "Login" ở A: gắn session cookie → reload → merge-push ---- */
  const loginPush = pageA.waitForResponse(isSyncPost);
  await ctxA.addCookies([sessionCookie()]);
  await pageA.goto("/");
  const pushRes = await loginPush;
  expect(pushRes.status()).toBe(200);

  /* ---- Context B: cùng user, load /my-vocab → pull dữ liệu A ---- */
  const ctxB = await browser.newContext();
  await ctxB.addCookies([sessionCookie()]);
  const pageB = await ctxB.newPage();
  const loginPull = pageB.waitForResponse(isSyncPost);
  await pageB.goto("/my-vocab");
  // gate server với session thật + data merged vào local B
  await expect(pageB.getByText("THE MEMORY COMMAND")).toBeVisible();
  const pullRes = await loginPull;
  expect(pullRes.status()).toBe(200);

  await expect
    .poll(() =>
      pageB.evaluate(() => ({
        srs: Object.keys(JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}")),
        heat: JSON.parse(localStorage.getItem("bye.heat") ?? "{}"),
      }))
    )
    .toEqual(expect.objectContaining({ srs: [srsKey], heat: expect.objectContaining({ [today]: 1 }) }));

  /* ---- B chỉnh data: grade "thuộc" thẻ 1 (recordReview) → flush debounce ---- */
  await pageB.goto("/lesson/hsk1/lesson-1");
  await pageB.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" }).click();
  await pageB.locator("button[data-grade]").first().click(); // chấm điểm → recordReview
  const flushB = pageB.waitForResponse(isSyncPost, { timeout: 20_000 });
  const bRes = await flushB; // debounce 5s của hybrid-store
  expect(bRes.status()).toBe(200);

  /* ---- A reload: pull merge — reviewCount của item phải >= 1 (max/timestamp thắng) ---- */
  const reloadPull = pageA.waitForResponse(isSyncPost);
  await pageA.goto("/lesson/hsk1/lesson-1");
  expect((await reloadPull).status()).toBe(200);
  await expect
    .poll(() =>
      pageA.evaluate((key) => {
        const items = JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}");
        return items[key]?.reviewCount ?? 0;
      }, srsKey)
    )
    .toBeGreaterThanOrEqual(1);

  await ctxA.close();
  await ctxB.close();
});
