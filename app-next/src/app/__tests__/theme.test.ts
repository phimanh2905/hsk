import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../globals.css"), "utf8");

describe("globals.css port theme.css", () => {
  it("giữ nguyên các class dùng chung của clone", () => {
    for (const cls of [".card", ".btn-main", ".btn-ghost", ".pill", ".pill-active", ".shadow-neo", ".toast", ".grid-cell", ".modal-backdrop", ".paper-grid", ".zh", ".zh-faded"]) {
      expect(css).toContain(cls);
    }
  });
  it("có đủ biến light + dark và màu chủ đạo đỏ Nhai", () => {
    expect(css).toContain("--nhai-main: #c23b22");
    expect(css).toContain("html.dark");
    expect(css).toContain("--nhai-bg: #1c1a17"); // dark bg
  });
  it("không còn Tailwind CDN / @tailwind directive cũ", () => {
    expect(css).not.toContain("cdn.tailwindcss.com");
    expect(css).toContain('@import "tailwindcss"');
  });
});
