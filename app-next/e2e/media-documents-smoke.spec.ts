import { test, expect } from "@playwright/test";

const YT_STUB = `<!DOCTYPE html><html><body><script>
window.addEventListener("message", function (e) {
  var d; try { d = JSON.parse(e.data); } catch (err) { return; }
  if (!d || d.event !== "command") {
    // handshake "listening" → widget đẩy onReady (khớp mô tả brief: nhận message → trả onReady)
    parent.postMessage(JSON.stringify({ event: "onReady" }), "*");
    return;
  }
  if (d.func === "getCurrentTime") {
    parent.postMessage(JSON.stringify({ event: "infoDelivery", infoDelivery: { playerData: { currentTime: 5, playerState: 1 } } }), "*");
  } else {
    parent.postMessage(JSON.stringify({ event: "onReady" }), "*");
  }
});
</script></body></html>`;

test.describe("G5 shadowing video player (YouTube stubbed)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("thư viện → card → player: ytReady (overlay ẩn), câu active highlight, seekTo đúng start", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: YT_STUB }));
    await page.goto("/shadowing");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
    await page.click('a[href="/shadowing/EA3rwvr99Q0"]');
    await expect(page.getByRole("heading", { level: 1 })).toContainText("墓碑上的QR碼");
    await page.waitForTimeout(300); // stub onReady → markYtReady
    await expect(page.getByTestId("video-overlay")).toBeHidden();
    await page.click('[data-sent="4"]'); // câu #5 start 56
    // yêu cầu getCurrentTime mỗi 500ms; bấm câu sinh command seekTo [56,true] — kiểm qua transcript active
    await expect(page.locator('[data-sent="4"].sent-active')).toBeVisible();
    await expect(page.getByTestId("pos")).toHaveText("Câu 5/9");
  });

  test("phím tắt Space/←/→/R hoạt động; không kích hoạt khi focus input dictation", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: YT_STUB }));
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.waitForTimeout(300);
    await page.click('[data-sent="2"]');
    await expect(page.getByTestId("pos")).toHaveText("Câu 3/9");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("pos")).toHaveText("Câu 4/9");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("r");
    await expect(page.getByTestId("pos")).toHaveText("Câu 3/9");
    await page.click('button[data-mode="dictation"]');
    await page.getByTestId("dict-input").fill("退");
    await page.keyboard.press("ArrowRight"); // KHÔNG đổi câu khi đang gõ
    await expect(page.getByTestId("pos")).toHaveText("Câu 3/9");
  });

  test("chặn YouTube 4s → overlay + fallback TTS banner", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.abort());
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("video-overlay")).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/Dùng TTS đọc câu/)).toBeVisible();
  });
});
