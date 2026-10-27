import { test, expect } from "@playwright/test";
/* TEMP debug: replica hybrid-sync bước B — log mọi POST /api/v1/sync payload */
test("debug B grade flush payload", async ({ page }) => {
  test.setTimeout(120_000);
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/sync") && r.method() === "POST") posts.push(r.postData() ?? "");
  });
  // login như hybrid-sync (dùng helper trùng lặp tối thiểu)
  const { execFileSync } = await import("node:child_process");
  const { createHmac, randomBytes } = await import("node:crypto");
  const { readFileSync } = await import("node:fs");
  const secret = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("BETTER_AUTH_SECRET="))!.slice("BETTER_AUTH_SECRET=".length).trim();
  const USER_ID = `dbg-${Date.now()}`;
  const TOKEN = randomBytes(16).toString("hex");
  execFileSync("pnpm", ["wrangler", "d1", "execute", "hsk-dev", "--local", "--config", "wrangler.dev.jsonc", "--command",
    `INSERT INTO user (id,name,email,emailVerified,image,createdAt,updatedAt) VALUES ('${USER_ID}','Dbg','${USER_ID}@t.local',1,NULL,unixepoch(),unixepoch()); INSERT INTO session (id,expiresAt,token,createdAt,updatedAt,userId,ipAddress,userAgent) VALUES ('s-${USER_ID}',strftime('%s','now')+86400,'${TOKEN}',unixepoch(),unixepoch(),'${USER_ID}',NULL,'dbg');`], { stdio: "ignore" });
  const sig = createHmac("sha256", secret).update(TOKEN).digest("base64");
  await page.context().addCookies([{ name: "better-auth.session_token", value: encodeURIComponent(`${TOKEN}.${sig}`), domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }]);
  // seed 1 srs item local như guest A đã push (tự thêm qua UI cho thật)
  await page.goto("/lesson/hsk1/lesson-1");
  await page.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" }).first().click();
  await expect(page.getByText("Đã thêm vào ôn tập")).toBeVisible();
  await page.waitForTimeout(6000); // đợi debounce flush 1
  // grade
  await page.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" }).click();
  await page.locator("button[data-grade]").first().click();
  await page.waitForTimeout(8000); // đợi debounce flush 2
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem("bye.srs.items") ?? "{}"));
  console.log("LOCAL SRS:", JSON.stringify(local).slice(0, 400));
  console.log("POST COUNT:", posts.length);
  posts.forEach((p, i) => console.log(`POST ${i}:`, p.slice(0, 300)));
  expect(posts.some((p) => p.includes('"reviewCount":1'))).toBe(true);
});
