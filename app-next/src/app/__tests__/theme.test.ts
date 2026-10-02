import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../globals.css"), "utf8");

describe("globals.css Hanzi design system tokens", () => {
  it("giữ các class dùng chung còn tham chiếu: .zh, .zh-faded, .shake, print helpers", () => {
    for (const cls of [".zh", ".zh-faded", "@keyframes shake", ".no-print", ".print-area", "@media print"]) {
      expect(css).toContain(cls);
    }
  });
  it("đã xóa hoàn toàn legacy theme Nhai", () => {
    for (const legacy of ["--nhai-", "--color-nhai-", ".card {", ".btn-main", ".btn-ghost", ".pill", ".grid-cell", ".shadow-neo", ".toast", ".modal-backdrop", ".paper-grid"]) {
      expect(css).not.toContain(legacy);
    }
  });
  it("có đủ token Hanzi light + dark và màu chủ đạo jade", () => {
    expect(css).toContain("--hz-jade: #0f766e");
    expect(css).toContain("html.dark");
    expect(css).toContain("--hz-paper: #1d1d1d"); // dark page
    expect(css).toContain("--color-action-primary");
  });
  it("không còn Tailwind CDN / @tailwind directive cũ", () => {
    expect(css).not.toContain("cdn.tailwindcss.com");
    expect(css).toContain('@import "tailwindcss"');
  });
});
