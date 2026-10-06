import { expect, test } from "@playwright/test";

/* Chống hồi quy hydration: server render phải khớp client render.
   Nguồn lỗi thật từng xảy ra: /pinyin/practice sinh câu hỏi bằng Math.random()
   ngay trong useState initializer → mỗi bên render 10 câu khác nhau. */

const ROUTES = [
  "/", "/course/hsk1", "/lesson/hsk1/lesson-1", "/review", "/progress",
  "/radicals", "/pinyin", "/pinyin/practice", "/sound-rules",
  "/roadmap", "/roadmap/pinyin", "/roadmap/pinyin/session/1",
  "/shadowing", "/shadowing/EA3rwvr99Q0", "/create-file", "/create-file/stroke-order",
  "/dictionary", "/hanzi", "/hanzi/你", "/reading", "/notebook",
  "/leaderboard", "/feedback", "/terms", "/privacy", "/delete-account",
];

test("không có hydration mismatch trên các route chính", async ({ page }) => {
  const errors: string[] = [];
  let current = "";
  page.on("pageerror", (e) => {
    if (/hydrat/i.test(e.message)) errors.push(`${current}: ${e.message.slice(0, 120)}`);
  });
  page.on("console", (m) => {
    if (/hydration failed/i.test(m.text())) errors.push(`${current}: ${m.text().slice(0, 120)}`);
  });
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) current = f.url().replace(/^http:\/\/[^/]+/, "");
  });

  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "networkidle" });
  }
  expect(errors, errors.join("\n")).toEqual([]);
});
