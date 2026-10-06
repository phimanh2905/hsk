import { test, expect } from "@playwright/test";

/* E2E cho task 12 — Hanzi Studio radical-first redesign.
   /hanzi là SSG + client state, không cần auth.
   Selector khớp DOM thật: card bộ thủ `[data-od-id="rad-X"]`, tray
   `[data-od-id="char-tray"]` với chip `[data-tray]`, bóc tách `decomp`,
   nút "Phát lại", tab "Tự luyện viết", nút "Gợi ý nét mờ" (aria-pressed).
   Chọn 口 vì có 26 chữ corpus → tray chắc chắn không rỗng. */

/* 口 nằm ở trang nào đó của catalog phân trang (PAGE_SIZE 8) — tìm qua ô search
   để đưa card về trang hiện tại thay vì bấm pager. */
async function openRadical(page: import("@playwright/test").Page, char: string) {
  const input = page.getByLabel("Tìm bộ thủ");
  const card = page.locator(`[data-od-id="rad-${char}"]`);
  /* fill trước khi React hydrate xong sẽ bị mất (controlled input) → chờ
     networkidle (dev server nhỏ, hydrate xong trước khi network rảnh) rồi retry. */
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await input.fill(char);
    await expect(card).toBeVisible();
  }).toPass({ timeout: 30_000 });
  await card.click();
}

test.describe("Hanzi Studio radical-first", () => {
  test("chọn bộ thủ → tray → nạp chữ → bóc tách", async ({ page }) => {
    await page.goto("/hanzi", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Hanzi Studio/ })).toBeVisible();

    await openRadical(page, "口");

    const tray = page.locator('[data-od-id="char-tray"]');
    await expect(tray).toBeVisible();
    const chip = page.locator("[data-tray]").first();
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(page.locator('[data-od-id="decomp"]')).toBeVisible();
    // watch controls hiển thị (mode mặc định là "watch")
    await expect(page.getByRole("button", { name: "Phát lại" })).toBeVisible();
  });

  test("deep-link ?rad=口", async ({ page }) => {
    await page.goto("/hanzi?rad=%E5%8F%A3", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Hanzi Studio/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-od-id="char-tray"]')).toBeVisible({ timeout: 15_000 });
    // deep-link chỉ chọn bộ → decomp (chỉ hiện khi nạp chữ) phải ẩn
    await expect(page.locator('[data-od-id="decomp"]')).toHaveCount(0);
  });

  test("draw mode bật gợi ý nét mờ", async ({ page }) => {
    await page.goto("/hanzi", { waitUntil: "domcontentloaded" });
    await openRadical(page, "口");

    await page.getByRole("button", { name: "Tự luyện viết" }).click();
    const hint = page.getByRole("button", { name: /Gợi ý nét mờ/ });
    await expect(hint).toBeVisible();
    await hint.click();
    await expect(hint).toHaveAttribute("aria-pressed", "true");
  });
});
