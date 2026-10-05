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
  it("đã xóa hoàn toàn legacy theme Bye", () => {
    for (const legacy of ["--bye-", "--color-bye-", ".card {", ".btn-main", ".btn-ghost", ".pill", ".shadow-neo", ".toast", ".modal-backdrop", ".paper-grid"]) {
      expect(css).not.toContain(legacy);
    }
  });
  it("giữ rule tokenized cho grid-cell (svg-render) + print-page/sheet (a4-preview)", () => {
    expect(css).toContain(".grid-cell");
    expect(css).toContain(".print-page,");
    expect(css).toContain(".sheet {");
  });
  it("có đủ token Hanzi light + dark và màu chủ đạo vermilion (spec 2026-10-04: Vermilion primary)", () => {
    expect(css).toContain("--hz-jade: #2d7d5b");
    expect(css).toContain("--hz-vermilion: #c83c32");
    expect(css).toContain("--action-primary: var(--hz-vermilion)");
    expect(css).toContain("html.dark");
    expect(css).toContain("--hz-paper: #111318"); // dark page
    expect(css).toContain("--color-action-primary");
    expect(css).toContain("--color-amber-wash");
    expect(css).toContain("--color-ring-track");
  });
  it("không còn Tailwind CDN / @tailwind directive cũ", () => {
    expect(css).not.toContain("cdn.tailwindcss.com");
    expect(css).toContain('@import "tailwindcss"');
  });
});
