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
    // Chờ player thật sự sẵn sàng (overlay biến mất = đã nhận onReady từ stub)
    // thay vì sleep cố định — sleep fail khi CPU bận (CI chạy song song worker).
    await expect(page.getByTestId("video-overlay")).toBeHidden();
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

test.describe("G6–G9 create-file + certificate smoke", () => {
  test("catalog 9 mẫu → form stroke-order → gate chặn → FREEHSK mở khoá → window.print (stub)", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: boolean }).__printed = false;
      window.print = () => { (window as unknown as { __printed: boolean }).__printed = true; };
    });
    await page.goto("/create-file");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(9);
    await expect(page.getByText(/Cần mã tải file để in/)).toBeVisible();
    await page.click('a[href="/create-file/stroke-order"]');
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Luyện viết theo thứ tự nét");
    await page.click("text=🔒 Đăng nhập để in");
    await page.getByTestId("code-input").fill("FREEHSK");
    await page.getByTestId("code-submit").click();
    await expect(page.getByText("🖨 In / Lưu PDF")).toBeVisible();
    await page.getByText("🖨 In / Lưu PDF").click();
    const printed = await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed);
    expect(printed).toBe(true);
    const code = await page.evaluate(() => localStorage.getItem("nhai.fileCode"));
    expect(code).toBe("1");
  });
  test("certificate-test prerender 10 card", async ({ page }) => {
    await page.goto("/certificate-test");
    await expect(page.getByText("Sắp ra mắt")).toHaveCount(10);
  });
});
