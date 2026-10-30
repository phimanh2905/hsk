import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

/* E2E tab "Bài của tôi" (Task 7, plan 2026-10-30-reading-ai-mine).
   Login bằng QA route POST /api/v1/auth/dev-login (header x-dev-secret, đọc từ
   .env.local — không in giá trị). Server cần READING_FAKE_LLM=1 (đặt trong
   webServer.env của playwright.config.ts) để generate trả doc giả pass validate.
   Mỗi test dev-login tạo user QA mới → quota luôn 3/3, localStorage trống.
   KHÔNG play audio/TTS: chỉ assert render + store. */

const SAMPLE_TEXT =
  "今天早上我起床的时候已经七点半了。我很快地洗脸刷牙，然后去楼下买了一个包子和一杯豆浆。包子很热，豆浆也很好喝。" +
  "吃完早饭，我坐地铁去公司上班。地铁上人很多，我站着看了一会儿手机。到了公司以后，我先给客户回了几封邮件，然后参加了一个小时的会议。" +
  "中午我和同事一起去吃午饭，我们点了三碗牛肉面，味道很不错。下午的工作不算太忙，五点半我就下班了。晚上我在家里做了一顿简单的晚饭，" +
  "吃完以后看了一部电影，十一点左右就睡觉了。";

function readEnvLocal(key: string): string {
  const line = readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} không tìm thấy trong .env.local`);
  return line.slice(key.length + 1).trim();
}

/** dev-login: page.request chia sẻ cookie jar với browser context → Set-Cookie
    của response rơi thẳng vào session, các page.goto sau đã đăng nhập. */
async function devLogin(page: Page): Promise<void> {
  const res = await page.request.post("/api/v1/auth/dev-login", {
    headers: { "x-dev-secret": readEnvLocal("DEV_LOGIN_SECRET") },
  });
  expect(res.ok(), "dev-login phải thành công (cần DEV_LOGIN_SECRET + NODE_ENV != production)").toBeTruthy();
}

/** Mở /reading, chờ compile/render (compile lạnh lần đầu cần timeout rộng),
    chuyển sang tab "Bài của tôi" và chờ session resolve (chip quota chỉ render
    khi loggedIn — bấm Tạo trước đó sẽ mở login modal thay vì gọi API). */
async function openMine(page: Page): Promise<void> {
  await page.goto("/reading");
  await expect(page.getByRole("heading", { name: "Bài đọc", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Bài của tôi" }).click();
  await expect(page.getByRole("heading", { name: "Tạo bài đọc bằng AI" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Còn 3/3 lượt")).toBeVisible({ timeout: 30_000 });
}

async function createDraft(page: Page): Promise<void> {
  await page.getByLabel("Văn bản tiếng Trung").fill(SAMPLE_TEXT);
  await page.getByRole("button", { name: "Tạo bài đọc" }).click();
  // Tạo xong server tự mở player + toast lưu.
  await expect(page.getByRole("button", { name: "← Danh sách" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Đã lưu vào Bài của tôi")).toBeVisible();
  await expect(page.locator('[data-sentence="0"]')).toContainText(SAMPLE_TEXT.slice(0, 10));
}

test.describe("Reading — Bài của tôi", () => {
  test("mở tab Mine: textarea + nút tạo + chip quota 3/3 (user mới)", async ({ page }) => {
    await devLogin(page);
    await openMine(page);
    await expect(page.getByLabel("Văn bản tiếng Trung")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tạo bài đọc" })).toBeVisible();
    await expect(page.getByText("Còn 3/3 lượt")).toBeVisible({ timeout: 30_000 });
  });

  test("tạo bài: player render câu + toast Đã lưu; quay lại thấy draft + chip 2/3", async ({ page }) => {
    await devLogin(page);
    await openMine(page);
    await createDraft(page);

    // Quay lại tab Mine → draft xuất hiện trong list (title = 40 ký tự đầu câu 1)
    await page.getByRole("button", { name: "← Danh sách" }).click();
    const card = page.getByRole("button").filter({ hasText: SAMPLE_TEXT.slice(0, 10) }).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText(/\d+ chữ/);
    await expect(page.getByText("Còn 2/3 lượt")).toBeVisible({ timeout: 30_000 });
  });

  test("rename: Pencil → input → gõ title mới + Enter → title mới hiện", async ({ page }) => {
    await devLogin(page);
    await openMine(page);
    await createDraft(page);
    await page.getByRole("button", { name: "← Danh sách" }).click();

    await page.getByRole("button", { name: "Đổi tên" }).click();
    const input = page.getByLabel("Tên bài mới");
    await expect(input).toBeVisible();
    await input.fill("Ngày thường của tôi");
    await input.press("Enter");

    await expect(page.getByRole("button").filter({ hasText: "Ngày thường của tôi" })).toBeVisible();
    // Title cũ (40 ký tự đầu) không còn ở dạng title card
    await expect(
      page.getByRole("button").filter({ hasText: SAMPLE_TEXT.slice(0, 10) }),
    ).toHaveCount(0);
  });

  test("delete 2 bước → card biến mất; reload → list vẫn trống (store)", async ({ page }) => {
    await devLogin(page);
    await openMine(page);
    await createDraft(page);
    await page.getByRole("button", { name: "← Danh sách" }).click();
    await expect(page.getByRole("button").filter({ hasText: SAMPLE_TEXT.slice(0, 10) }).first()).toBeVisible();

    // Bước 1: xác nhận → nút "Xóa?" đỏ
    await page.getByRole("button", { name: "Xóa bài" }).click();
    const confirm = page.getByRole("button", { name: "Xóa?" });
    await expect(confirm).toBeVisible();
    // Bước 2: xóa thật
    await confirm.click();

    await expect(page.getByRole("button").filter({ hasText: SAMPLE_TEXT.slice(0, 10) })).toHaveCount(0);
    await expect(page.getByText("Chưa có bài nào. Tạo bài đầu tiên ở trên nhé.")).toBeVisible();

    // Reload → store đã xóa, list vẫn trống
    await page.reload();
    await expect(page.getByRole("heading", { name: "Bài đọc", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Bài của tôi" })).toBeVisible();
    // tab đang là mine (URL ?tab=mine) → panel hiện trực tiếp
    await expect(page.getByText("Chưa có bài nào. Tạo bài đầu tiên ở trên nhé.")).toBeVisible({ timeout: 30_000 });
  });
});
