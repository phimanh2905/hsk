const { chromium } = require("@playwright/test");
const path = require("path");

const BASE = "http://127.0.0.1:3100";
const SHOTS = "/Users/manhphi/Documents/Development/App/hsk/.superpowers/sdd/2026-10-04-app-shell-v2/shots";
const out = [];
const log = (m) => { out.push(m); console.log(m); };

(async () => {
  const browser = await chromium.launch();

  for (const vp of [{ w: 1280, name: "1280" }, { w: 1024, name: "1024" }, { w: 900, name: "900" }, { w: 420, name: "420" }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: 800 } });
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const navSel = 'nav[aria-label="Điều hướng chính"]';
    const sidebarVisible = await page.locator(navSel).isVisible().catch(() => false);
    const asideBox = await page.locator("aside").first().boundingBox().catch(() => null);
    const navBox = sidebarVisible ? await page.locator(navSel).boundingBox().catch(() => null) : null;
    const hamburger = await page.getByRole("button", { name: "Mở menu" }).isVisible().catch(() => false);
    const bottomNav = await page.locator('nav[aria-label="Điều hướng di động"]').isVisible().catch(() => false);
    const bottomNavBox = bottomNav ? await page.locator('nav[aria-label="Điều hướng di động"]').boundingBox().catch(() => null) : null;
    const headerText = (await page.locator("header").textContent())?.replace(/\s+/g, " ").slice(0, 160);
    const search = await page.getByRole("button", { name: "Tìm kiếm" }).isVisible().catch(() => false);
    const level = await page.getByRole("button", { name: "Đổi cấp độ HSK" }).isVisible().catch(() => false);
    const streak = await page.locator('[title="Chuỗi ngày học liên tục"]').isVisible().catch(() => false);
    const theme = await page.getByRole("button", { name: "Chuyển chế độ sáng tối" }).isVisible().catch(() => false);

    log(`\n=== viewport ${vp.name} ===`);
    log(`sidebar visible=${sidebarVisible} asideBox=${JSON.stringify(asideBox)} navBox=${JSON.stringify(navBox)}`);
    log(`hamburger=${hamburger} bottomNav=${bottomNav} box=${JSON.stringify(bottomNavBox)}`);
    log(`topbar search=${search} level=${level} streak=${streak} theme=${theme}`);
    log(`header: ${headerText}`);

    await page.screenshot({ path: path.join(SHOTS, `home-${vp.name}.png`) });

    if (vp.name === "1280") {
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(600);
      const dialog = page.locator('[role="dialog"][aria-label="Tìm kiếm nhanh"]');
      const db = await dialog.boundingBox().catch(() => null);
      const inHeader = await dialog.evaluate((el) => !!el.closest("header")).catch(() => null);
      const wrapper = await dialog.evaluate((el) => {
        const r = el.parentElement.getBoundingClientRect(); const s = getComputedStyle(el.parentElement);
        return { x: r.x, y: r.y, w: r.width, h: r.height, position: s.position, inset: s.inset };
      }).catch(() => null);
      log(`palette box=${JSON.stringify(db)} closest-header=${inHeader} wrapper=${JSON.stringify(wrapper)}`);
      await page.screenshot({ path: path.join(SHOTS, "palette-1280.png") });
      await dialog.locator("input").first().fill("rev");
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, "palette-filter-1280.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      log(`palette Escape closed=${(await dialog.count()) === 0}`);
    }

    if (vp.name === "420") {
      await page.getByRole("button", { name: "Mở menu" }).click();
      await page.waitForTimeout(600);
      const drawerVisible = await page.locator('nav[aria-label="Điều hướng chính"]').isVisible().catch(() => false);
      const scrim = await page.evaluate(() => {
        return [...document.querySelectorAll("div")]
          .map((d) => ({ r: d.getBoundingClientRect(), s: getComputedStyle(d) }))
          .filter(({ r, s }) => s.position === "fixed" && s.backgroundColor !== "rgba(0, 0, 0, 0)" && r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && !d.querySelector("nav"))
          .map(({ r, s }) => ({ w: r.width, h: r.height, bg: s.backgroundColor, z: s.zIndex }));
      });
      log(`420 drawer visible=${drawerVisible} full-viewport scrims=${JSON.stringify(scrim.slice(0, 3))}`);
      await page.screenshot({ path: path.join(SHOTS, "drawer-420.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      log(`420 Escape closed drawer=${!(await page.locator('nav[aria-label="Điều hướng chính"]').isVisible().catch(() => false))}`);
      await page.screenshot({ path: path.join(SHOTS, "drawer-closed-420.png") });
      const more = page.locator('nav[aria-label="Điều hướng di động"] button', { hasText: "More" });
      const moreCount = await more.count();
      if (moreCount) { await more.first().click(); await page.waitForTimeout(500); }
      log(`420 More count=${moreCount} drawer visible after More=${await page.locator('nav[aria-label="Điều hướng chính"]').isVisible().catch(() => false)}`);
      await page.screenshot({ path: path.join(SHOTS, "drawer-more-420.png") });
      await page.keyboard.press("Escape");
    }

    if (vp.name === "1280") {
      await page.getByRole("button", { name: "Chuyển chế độ sáng tối" }).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SHOTS, "home-1280-dark.png") });
      await page.getByRole("button", { name: "Chuyển chế độ sáng tối" }).click();
      await page.waitForTimeout(400);
    }
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  log(`\npalette Enter navigated to: ${page.url()}`);
  await page.close();

  const mock = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await mock.goto("file:///Users/manhphi/Documents/Development/App/hsk/opendesign_hsk/app-shell.html");
  await mock.waitForTimeout(800);
  await mock.screenshot({ path: path.join(SHOTS, "mock-app-shell-1280.png") });
  log("mock screenshot saved");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
