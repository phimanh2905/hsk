import { describe, it, expect } from "vitest";
import { renderPages, estimatePages, renderStrokeSvg, cellShape, strokeDataOf } from "../svg-render";
import { cfDefaultsFor, cfDefaults } from "../types";

describe("renderPages — blank-grid (grid-paper) lưới 12×14 đúng ô", () => {
  it("1 trang đủ 14 hàng × 12 ô, mỗi ô div.grid-cell với --cell-c gray", () => {
    const pages = renderPages(cfDefaultsFor("grid-paper"));
    expect(pages).toHaveLength(1);
    const rows = pages[0].match(/style="grid-template-columns:repeat\(12,minmax\(0,1fr\)\)"/g)!;
    expect(rows).toHaveLength(14); // fillRows 1 + blankRows 0 → tối thiểu 1 trang đầy 14 hàng
    expect(pages[0].match(/grid-cell/g)!.length).toBe(12 * 14);
    expect(pages[0]).toContain("--cell-c:#9ca3af");
    expect(pages[0]).toContain("nhaihsk.com · facebook.com/groups/nhaihsk");
  });
  it("blankRows 28 → 3 trang (14/14/14)", () => {
    const st = { ...cfDefaultsFor("grid-paper"), fillRows: 14, blankRows: 28 };
    expect(renderPages(st)).toHaveLength(3);
    expect(estimatePages(st)).toBe(3);
  });
});

describe("renderPages — stroke-order nét đỏ bước nét", () => {
  it("mỗi chữ 1 block: meta VĨNH + polyline đỏ (#c23b22) ở ô bước nét cuối", () => {
    const pages = renderPages(cfDefaultsFor("stroke-order"));
    expect(pages).toHaveLength(1); // 6 chữ / 2
    expect(estimatePages(cfDefaultsFor("stroke-order"))).toBe(3);
    expect(pages[0]).toContain("VĨNH");
    expect(pages[0]).toContain('stroke="#c23b22"');
    expect(pages[0]).toContain("①"); // nhãn bước nét
    expect(pages[0]).toContain("Họ tên: ______________");
  });
});

describe("cell render", () => {
  it("cellShape theo cellType: mi → 2 chéo + chữ thập nét đứt; cuu-cung → chữ thập", () => {
    expect(cellShape({ ...cfDefaults(), cellType: "mi" })).toContain('stroke-dasharray="4 4"');
    expect(cellShape({ ...cfDefaults(), cellType: "cuu-cung" })).toMatch(/<line x1="50" y1="0"/);
    expect(cellShape({ ...cfDefaults(), cellType: "vuong" })).toBe("");
  });
  it("renderStrokeSvg mode k: nét > k ẩn, nét k đỏ; faint mờ 0.14", () => {
    expect(renderStrokeSvg("永", 1)).toContain('stroke-opacity="1"');
    expect(renderStrokeSvg("永", 1)).not.toContain('points="28,44'); // nét 3 bị ẩn
    expect(renderStrokeSvg("永", "faint")).toContain('stroke-opacity="0.14"');
    expect(strokeDataOf("カ")).toHaveLength(4); // genericStrokes fallback
  });
  it("cover: bìa 练 + Họ tên/Lớp/Năm học", () => {
    const p = renderPages(cfDefaultsFor("cover"));
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("Sổ luyện viết chữ Hán");
    expect(p[0]).toContain("Năm học");
  });
});
