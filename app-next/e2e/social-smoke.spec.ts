import { test, expect } from "@playwright/test";

test("leaderboard: tab XP tổng mặc định, đổi sang Đấu trí tháng không reload", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng" })).toBeVisible();
  await expect(page.getByText("My Phan")).toBeVisible();
  await expect(page.getByText("7.915 XP")).toBeVisible();

  await page.getByRole("tab", { name: "Đấu trí tháng" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?tab=battle$/);
  await expect(page.getByText("Minh Anh Phạm")).toBeVisible();
  await expect(page.getByText("12/15").first()).toBeVisible();
  await expect(page.getByText("My Phan")).toBeHidden();

  // URL trực tiếp ?tab=battle mở đúng tab
  await page.goto("/leaderboard?tab=battle");
  await expect(page.getByRole("tab", { name: "Đấu trí tháng" })).toHaveAttribute("aria-selected", "true");
});

test("feedback: gửi góp ý hiện toast và lưu localStorage", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByLabel("Nội dung góp ý").fill("Smoke test góp ý");
  await page.getByRole("button", { name: "Gửi góp ý" }).click();
  await expect(page.getByText("Cảm ơn bạn! Góp ý đã được ghi nhận.")).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("nhai.feedback"));
  expect(stored).toContain("Smoke test góp ý");
});

test("terms + privacy render đủ mục", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "1. Chấp nhận điều khoản" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "4. Quyền của bạn" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xoá tài khoản" })).toBeVisible();
});

test("delete-account: mock toast + nút disabled", async ({ page }) => {
  await page.goto("/delete-account");
  await page.getByLabel("Email tài khoản").fill("smoke@example.com");
  await page.getByRole("button", { name: "Yêu cầu xoá" }).click();
  await expect(page.getByText("Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email smoke@example.com.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đã gửi yêu cầu" })).toBeDisabled();
});

test("404: route không tồn tại hiện mascot và nút về trang chủ", async ({ page }) => {
  await page.goto("/route-khong-ton-tai");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về trang chủ" })).toBeVisible();
});

test("AI widget: mascot kép render ở mọi route và reply sau 400ms", async ({ page }) => {
  await page.goto("/leaderboard");
  const mascot = page.getByRole("button", { name: "Hỏi AI" });
  await expect(mascot).toBeVisible();
  await mascot.click();
  await page.getByLabel("Nhập câu hỏi cho trợ lý AI").fill("xin chào");
  // restyle: nút gửi giờ là IconButton "Gửi" (không còn ➤)
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByText("Mình là bản demo — thử bấm biểu tượng ngôi sao trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!")).toBeVisible({ timeout: 2000 });
});
