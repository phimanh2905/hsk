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

// Lưu ý: test phím Space thu âm (recorder) KHÔNG đưa vào e2e — cần fake mic device;
// đã phủ bởi unit test của use-recorder/use-player-engine (Task 9).
test.describe("G5 shadowing (UI redesign)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("library: hero + filter + grid + drawer dẫn sang studio", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByTestId("shadow-header")).toBeVisible();
    await expect(page.getByTestId("daily-pick")).toBeVisible();
    await expect(page.getByTestId("video-grid").locator("button").first()).toBeVisible();
    // card dùng data-od-id (không phải data-testid)
    await page.locator('[data-od-id="video-EA3rwvr99Q0"]').click();
    const drawer = page.getByRole("dialog", { name: "Xem trước hội thoại" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Mở bài luyện đầy đủ" }).click();
    await expect(page).toHaveURL(/\/shadowing\/EA3rwvr99Q0/);
  });

  test("studio: yt-stub ready, transcript active, phím K play, dictation", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) =>
      route.fulfill({ contentType: "text/html", body: YT_STUB }));
    // Chờ player sẵn sàng (overlay biến mất = đã nhận onReady từ stub);
    // hydration chậm hơn iframe → reload một lần để iframe mount sau hydration.
    if (await page.getByTestId("video-overlay").isVisible()) {
      await page.reload();
    }
    await expect(page.getByTestId("video-overlay")).toBeHidden();
    const first = page.locator("[data-sent='0']");
    await expect(first).toHaveClass(/sent-active/);
    await expect(page.getByTestId("pos")).toHaveText(/Câu 1\//);
    await page.keyboard.press("k");
    await expect(page.locator("[data-play]")).toHaveText(/Tạm dừng/);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-sent='1']")).toHaveClass(/sent-active/);
    // dictation
    await page.getByRole("button", { name: "Chép chính tả" }).click();
    const zh = await page.locator("[data-sent='1'] [data-zh]").innerText();
    await page.getByTestId("dict-input").fill(zh);
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-result")).toContainText(/Chính xác/);
    // hydration & sent-active style thật
    const border = await page.locator("[data-sent='1']").evaluate((el) => getComputedStyle(el).borderColor);
    expect(border).not.toBe("rgba(0, 0, 0, 0)");
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
    // restyle: gate mở bằng Button "Đăng nhập để in" (không còn 🔒; print-button + badge trong gate cùng tên → .first())
    await page.getByRole("button", { name: "Đăng nhập để in" }).first().click();
    await page.getByTestId("code-input").fill("FREEHSK");
    await page.getByTestId("code-submit").click();
    await expect(page.getByRole("button", { name: "In / Lưu PDF" })).toBeVisible();
    await page.getByRole("button", { name: "In / Lưu PDF" }).click();
    const printed = await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed);
    expect(printed).toBe(true);
    const code = await page.evaluate(() => localStorage.getItem("bye.fileCode"));
    expect(code).toBe("1");
  });
  test("certificate-test prerender 10 card", async ({ page }) => {
    await page.goto("/certificate-test");
    await expect(page.getByText("Sắp ra mắt")).toHaveCount(10);
  });
});
