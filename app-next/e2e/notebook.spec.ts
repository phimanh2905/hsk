import { test, expect } from "@playwright/test";

/* E2E G-notebook (UI redesign — Task 13).
   Sidebar desktop-only (lg ≥1024px): viewport mặc định của Playwright là 1280x720
   (không set viewport trong playwright.config.ts) → sidebar hiển thị sẵn, không cần setViewportSize. */

const SEED = [
  {
    id: "e2e-wrong-1", kind: "wrong", tag: "🛑 Lỗi sai trong bài thi thử HSK 4", tagTone: "red",
    payload: { q: "昨天太累了，我一回到家就睡着了。", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "“居然” biểu thị sự bất ngờ ngoài dự kiến." },
    saved: false, hsk: "HSK4", source: "auto",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "e2e-personal-1", kind: "personal", tag: "📝 Ghi chú cá nhân", tagTone: "per",
    payload: { note: "Khi từ chối lịch sự, dùng “恐怕不太方便”." },
    saved: true, hsk: null, source: "manual",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

test.describe("G-notebook dashboard (UI redesign)", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // guest

  test("hero/shelf/filters/stream/search/ghim", async ({ page }) => {
    await page.addInitScript((seed) => localStorage.setItem("bye.notebookEntries", JSON.stringify(seed)), SEED);
    await page.goto("/notebook");
    // hero
    await expect(page.getByTestId("notebook-hero")).toContainText("Có 1 câu làm sai tuần này");
    await expect(page.getByTestId("notebook-cta")).toHaveAttribute("href", "/review");
    // shelf
    await expect(page.getByTestId("book-mistakes")).toContainText("1 câu hỏi cần nhớ");
    await expect(page.getByTestId("book-confusables")).toBeVisible();
    // stream: filter mặc định "wrong" → 1 card; personal bị ẩn
    await expect(page.getByTestId("note-e2e-wrong-1")).toBeVisible();
    expect(await page.getByTestId("note-e2e-personal-1").count()).toBe(0);
    // filter all → 2 card
    await page.getByRole("button", { name: "Tất cả mục" }).click();
    await expect(page.getByTestId("note-e2e-personal-1")).toBeVisible();
    // search
    await page.getByLabel("Tìm kiếm trong tất cả sổ tay").fill("không-tồn-tại");
    await expect(page.getByTestId("stream-empty")).toBeVisible();
    await page.getByLabel("Tìm kiếm trong tất cả sổ tay").fill("居然");
    await expect(page.getByTestId("note-e2e-wrong-1")).toBeVisible();
    // ghim ★ (guest → localStorage)
    await page.getByTestId("note-e2e-wrong-1").getByRole("button", { name: "Yêu thích" }).click();
    await expect(page.getByTestId("note-e2e-wrong-1").getByRole("button", { name: "Yêu thích" })).toHaveAttribute("aria-pressed", "true");
  });

  test("tạo ghi chú cá nhân từ dialog", async ({ page }) => {
    // Viewport cao hơn để hàng filter (nút add-note, gần mép phải) không nằm dưới
    // FAB mascot AI (fixed bottom-right z-[600]) — ở 1280x720 FAB chặn click.
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/notebook");
    await page.getByTestId("add-note").click();
    await page.getByLabel("Nội dung ghi chú").fill("Mẫu câu e2e kiểm tra");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByText("Mẫu câu e2e kiểm tra")).toBeVisible();
  });

  test("sidebar có link Sổ tay và palette điều hướng", async ({ page }) => {
    await page.goto("/");
    // Sidebar desktop hiển thị ở viewport mặc định 1280x720 (lg ≥1024px).
    await expect(page.getByRole("link", { name: "Sổ tay", exact: true })).toBeVisible();
    await page.goto("/notebook");
    await expect(page.getByTestId("notebook-hero")).toBeVisible();
  });
});
