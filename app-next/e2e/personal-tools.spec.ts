import { test, expect } from "@playwright/test";

/* UPG-2: gate không còn đọc localStorage mock mà gọi better-auth `GET
   /api/v1/auth/get-session`. E2E chỉ test UI, không test better-auth, nên
   chặn network để trả session giả — đây là black-box, không cần D1/Google. */
const FAKE_SESSION = {
  session: {
    id: "e2e-session",
    token: "e2e-token",
    userId: "e2e-user",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  user: {
    id: "e2e-user",
    name: "Người E2E",
    email: "e2e@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

async function fakeLogin(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/auth/get-session", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAKE_SESSION),
      });
      return;
    }
    await route.continue();
  });
}

test.describe("public routes (không cần login)", () => {
  for (const [path, text] of [
    ["/review", "cần kích hoạt lại trí nhớ"],
    ["/dictionary", "Tra từ điển"],
    ["/hanzi", "Phân tích Hán tự"],
    ["/reading", "Bài đọc"],
  ] as const) {
    test(`render ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
  test("/hanzi/你 render chi tiết 7 nét", async ({ page }) => {
    await page.goto("/hanzi/" + encodeURIComponent("你"));
    await expect(page.getByRole("heading", { name: "你 - NHĨ" })).toBeVisible();
    // svg nét chữ được tạo trong useEffect sau hydration → chờ trước khi đếm
    await expect(page.locator("svg polyline").first()).toBeAttached({ timeout: 10_000 });
    expect(await page.locator("svg polyline").count()).toBe(7);
  });
  test("dictionary search 3 kiểu + ?q= giữ kết quả", async ({ page }) => {
    await page.goto("/dictionary?q=xuexi");
    await expect(page.getByText(/kết quả cho/)).toBeVisible();
    await page.goto("/dictionary");
    await page.getByPlaceholder(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/).fill("học");
    await page.getByRole("button", { name: "Tra từ", exact: true }).click();
    await expect(page.getByText(/kết quả cho/)).toBeVisible();
  });
});

test.describe("gated routes (session thật qua better-auth)", () => {
  test.use({ storageState: undefined }); // đảm bảo sạch cookie

  test("chưa login → 🔒 đúng sub từng trang", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByText("Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.")).toBeVisible();
    await page.goto("/my-vocab");
    await expect(page.getByText("Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.")).toBeVisible();
  });

  test("progress + my-vocab render khi có session", async ({ page }) => {
    await fakeLogin(page);
    await page.goto("/progress");
    await expect(page.getByText("Điểm của bạn")).toBeVisible();
    await expect(page.getByText("12 tháng gần đây")).toBeVisible();
    await page.goto("/my-vocab");
    await expect(page.getByText("Sổ mẫu").first()).toBeVisible();
    await page.goto("/notebook/vocab/vocab-hsk30");
    await expect(page.getByText("Từ vực HSK 3.0")).toBeVisible();
    await expect(page.getByText("时间").first()).toBeVisible();
  });

  test("luồng tạo deck → học deck qua lesson custom", async ({ page }) => {
    await fakeLogin(page);
    await page.addInitScript(() => {
      localStorage.setItem("nhai.decks", JSON.stringify([
        { id: "nb-e2e", name: "Bộ e2e", rows: [
          { hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" },
          { hanzi: "朋友", pinyin: "péngyou", hanviet: "bằng hữu", meaning: "bạn bè" },
        ], updatedAt: new Date().toISOString() },
      ]));
    });
    await page.goto("/my-vocab");
    await page.getByText("Tạo bộ mới").first().click();
    await page.getByPlaceholder("Nhập tên sổ tay / bộ từ vựng…").fill("Bộ từ e2e thứ hai");
    await page.getByText("Tạo", { exact: true }).click();
    await expect(page.getByText("Đã tạo Bộ từ e2e thứ hai")).toBeVisible();
    await page.goto("/lesson/custom/nb-e2e");
    await expect(page.getByText("Bộ e2e")).toBeVisible();
    await expect(page.getByText("时间").first()).toBeVisible();
  });
});

test("sitemap chứa route public mới, không chứa route gated", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/dictionary", "/hanzi", "/reading"]) expect(xml).toContain(p);
  expect(xml).not.toContain("/review");
  expect(xml).not.toContain("/my-vocab");
});
