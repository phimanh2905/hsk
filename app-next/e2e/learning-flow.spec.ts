import { test, expect } from "@playwright/test";

test("home → course → lesson → flip → star từ (luồng chính)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chào bạn 👋" })).toBeVisible();
  await page.getByRole("link", { name: /Nhai HSK 1/ }).click();
  await expect(page).toHaveURL(/\/course\/hsk1/);
  await page.getByRole("link", { name: /Xin chào!/ }).click();
  await expect(page).toHaveURL(/\/lesson\/hsk1\/lesson-1/);
  await page.getByText("Click để lật").click();
  await expect(page.locator("#mode-content").getByText("Xin chào", { exact: true })).toBeVisible(); // nghĩa mặt sau
  await page.getByTitle("Thêm vào bộ thẻ ôn tập").first().click();
  await expect(page.getByText("Đã thêm vào ôn tập")).toBeVisible();
});

test("sitemap chứa đúng các route public", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  const xml = await res.text();
  for (const path of ["/", "/course", "/course/hsk1", "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin"]) {
    expect(xml).toContain(`<loc>http://localhost:3000${path}</loc>`);
  }
  expect(xml).not.toContain("/lesson/custom");
  expect(xml).not.toContain("/review");
});

test("metadata lesson chứa tên bài", async ({ page }) => {
  await page.goto("/lesson/hsk1/lesson-1");
  await expect(page).toHaveTitle(/Xin chào!/);
});
