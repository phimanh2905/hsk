import { expect, test } from "@playwright/test";

/* Smoke content D1 (plan dehardcode Pha 1) — webServer `pnpm dev` dùng D1 dev
   remote (wrangler.dev.jsonc, remote: true) đã seed content_vocabs + shadowing. */

test.describe("content từ D1", () => {
  test("course hsk1 render danh sách bài", async ({ page }) => {
    await page.goto("/course/hsk1");
    await expect(page.getByRole("heading", { name: /HSK 1/ })).toBeVisible();
  });

  test("lesson hsk1/lesson-1 render từ vựng từ D1", async ({ page }) => {
    await page.goto("/lesson/hsk1/lesson-1");
    await expect(page.locator("body")).toContainText(/你好|nǐ hǎo/i);
  });

  test("shadowing library render video từ D1", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByText("DaihuaXiyou").first()).toBeVisible();
  });

  test("playlist Hội thoại theo bài render từ D1 (W3.3)", async ({ page }) => {
    await page.goto("/shadowing");
    // Library render video cards (tên playlist không hiển thị ở card level) —
    // assert 1 video audio của playlist "Hội thoại theo bài" có mặt.
    await expect(page.getByText("Chào hỏi & xưng hô").first()).toBeVisible();
  });

  // T7 đã xong phần code: route catch-all [...videoId] + <audio data-testid="audio-player">
  // (unit + studio test xanh). Còn fixme vì DATA chưa có: dialogueByLesson rỗng
  // (gen-dialogues + render Kokoro chưa chạy) → D1 chưa có video "hsk1/lesson-1"
  // → route trả 404. Bật lại khi data dialogues được seed vào D1 dev.
  test("video audio hội thoại hsk1/lesson-1 trả 200 và có <audio>", async ({ page }) => {
    const res = await page.goto("/shadowing/hsk1/lesson-1");
    expect(res?.status()).toBe(200);
    const audio = page.locator('audio[data-testid="audio-player"]');
    await expect(audio).toHaveCount(1);
  });

  // T10 acceptance (data-gated, cùng lý do fixme trên): playlist audio qua API +
  // audio player ở studio + file mp3 render bởi Kokoro trên public/.
  // Bật khi gen-dialogues + render-dialogue-audio + seed D1 dev xong cho HSK 1–3.
  test("playlist audio + player + mp3 (acceptance W3)", async ({ page, request }) => {
    // API /api/v1/content/shadowing không đổi — trả playlist "Hội thoại theo bài".
    const api = await request.get("/api/v1/content/shadowing");
    expect(api.ok()).toBeTruthy();
    const body = (await api.json()) as { playlists?: Array<{ title?: string }> };
    const list = body.playlists ?? [];
    expect(list.some((p) => (p.name ?? "").includes("Hội thoại theo bài"))).toBeTruthy();
    // Studio chứa <audio data-testid="audio-player"> (hsk2/lesson-1).
    await page.goto("/shadowing/hsk2/lesson-1");
    await expect(page.locator('audio[data-testid="audio-player"]')).toHaveCount(1);
    // File mp3 được serve từ public/audio/.
    const head = await request.head("/audio/hsk1/lesson-1-1.mp3");
    expect(head.status()).toBe(200);
  });

  // Case KHÔNG cần audio (chạy trong baseline): trang /reading render từ static
  // passages (W3.4/T9) — không phụ thuộc D1 hay file mp3.
  test("trang /reading render không cần audio", async ({ page }) => {
    await page.goto("/reading");
    await expect(page.getByRole("heading", { name: "Bài đọc", exact: true })).toBeVisible();
  });

  test("lesson sai key trả 404", async ({ page }) => {
    const res = await page.goto("/lesson/hsk9/khong-co");
    expect(res?.status()).toBe(404);
  });
});
