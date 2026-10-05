import { test, expect } from "@playwright/test";

test("home → course → lesson → flip → star từ (luồng chính)", async ({ page }) => {
  await page.goto("/");
  // trang chủ mới (glance + hero + matrix): h1 chào theo giờ + section Lộ trình HSK
  await expect(page.getByRole("heading", { name: /chào bạn!/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lộ trình HSK" })).toBeVisible();
  await page.goto("/course");
  await page.getByRole("link", { name: /Nhai HSK 1/ }).click();
  await expect(page).toHaveURL(/\/course\/hsk1/);
  await page.getByRole("link", { name: /Xin chào!/ }).click();
  await expect(page).toHaveURL(/\/lesson\/hsk1\/lesson-1/);
  // flash mode mới (FlashStage): chạm thẻ để lật, nghĩa hiện trong panel reveal
  await page.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" }).click();
  await expect(
    page
      .getByRole("article", { name: "Thẻ đã lật, chấm điểm ghi nhớ bên dưới" })
      .getByText("Xin chào", { exact: true })
  ).toBeVisible();
  // restyle: star giờ là IconButton (accessible name thay vì title)
  await page.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" }).first().click();
  await expect(page.getByText("Đã thêm vào ôn tập")).toBeVisible();
});

test("sitemap chứa đúng các route public", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  const xml = await res.text();
  for (const path of ["/", "/course", "/course/hsk1", "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin"]) {
    expect(xml).toContain(`<loc>http://localhost:3100${path}</loc>`);
  }
  expect(xml).not.toContain("/lesson/custom");
  expect(xml).not.toContain("/review");
});

test("metadata lesson chứa tên bài", async ({ page }) => {
  await page.goto("/lesson/hsk1/lesson-1");
  await expect(page).toHaveTitle(/Xin chào!/);
});
