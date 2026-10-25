import { test, expect } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/* Wave 7 AI assistant — E2E widget Tiểu Ngữ (Task 7).
   Phương án A của brief: mock upstream ở Playwright route level
   (page.route với pattern wildcard) — không gọi buffproxy thật.
   Test logged-in dùng session thật giống e2e/hybrid-sync.spec.ts: tạo
   user + session row trong D1 dev remote rồi tự ký cookie
   `better-auth.session_token` (HMAC-SHA256 theo signCookieValue của
   better-call). Widget mount ở src/app/layout.tsx nên mở trang chủ là đủ. */

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
  USER_ID = `e2e-ai-${suffix}`;
  SESSION_TOKEN = randomBytes(24).toString("hex");
  const future = "strftime('%s','now')+86400";
  d1Run(
    `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt) ` +
      `VALUES ('${USER_ID}', 'E2E AI', '${USER_ID}@test.local', 1, NULL, unixepoch(), unixepoch());` +
      `INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId, ipAddress, userAgent) ` +
      `VALUES ('e2e-ai-sess-${suffix}', ${future}, '${SESSION_TOKEN}', unixepoch(), unixepoch(), '${USER_ID}', NULL, 'e2e');`
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

async function openWidget(page: import("@playwright/test").Page) {
  await page.goto("/");
  const mascot = page.getByRole("button", { name: "Hỏi AI" });
  await expect(mascot).toBeVisible();
  await mascot.click();
  await expect(page.getByText("Tiểu Ngữ — trợ lý AI của Bye HSK")).toBeVisible();
}

test("guest mở widget → thấy nút đăng nhập, không có ô nhập", async ({ page }) => {
  await openWidget(page);
  const loginLink = page.getByRole("link", { name: "Đăng nhập để hỏi Tiểu Ngữ" });
  await expect(loginLink).toBeVisible();
  await expect(page.getByLabel("Nhập câu hỏi cho trợ lý AI")).toHaveCount(0);
});

test("user đăng nhập gửi tin nhắn → nhận phản hồi từ upstream (mock)", async ({ page, context }) => {
  await context.addCookies([sessionCookie()]);

  // Mock upstream ở route level: bất kỳ POST /api/ai nào cũng trả text giả,
  // không chạm route handler thật (không cần AI_UPSTREAM_* trong dev).
  await page.route("**/api/ai", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    const body = (await req.postDataJSON()) as { messages?: { role: string }[] };
    expect(body.messages?.at(-1)?.role).toBe("user");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: "Chào bạn!" }),
    });
  });

  await openWidget(page);
  const input = page.getByLabel("Nhập câu hỏi cho trợ lý AI");
  await expect(input).toBeVisible();
  await input.fill("xin chào");
  await input.press("Enter");

  // exact: tránh khớp nhầm heading chào mừng "…, chào bạn!" trên trang chủ
  await expect(page.getByText("Chào bạn!", { exact: true })).toBeVisible({ timeout: 15_000 });
});
