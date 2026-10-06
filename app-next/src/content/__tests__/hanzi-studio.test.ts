import { describe, it, expect } from "vitest";
import { STUDIO_CHARS, STUDIO_LEVELS } from "../hanzi-studio";

describe("STUDIO_CHARS (dữ liệu demo 12 chữ — port mock)", () => {
  it("đủ 12 chữ đúng thứ tự mock, không trùng", () => {
    expect(STUDIO_CHARS.map((c) => c.ch)).toEqual(
      ["爱", "好", "人", "大", "国", "汉", "书", "口", "日", "木", "水", "心"]
    );
  });

  it("mỗi chữ: d.length === p.length === order.length === n", () => {
    for (const c of STUDIO_CHARS) {
      expect(c.d.length, `${c.ch}: d`).toBe(c.n);
      expect(c.p.length, `${c.ch}: p`).toBe(c.n);
      expect(c.order.length, `${c.ch}: order`).toBe(c.n);
    }
  });

  it("hsk thuộc bảng level (trừ 'all'); st chỉ là done/mid/new", () => {
    const levels = STUDIO_LEVELS.filter((l) => l !== "all");
    for (const c of STUDIO_CHARS) {
      expect(levels, `${c.ch}: hsk`).toContain(c.hsk);
      expect(["done", "mid", "new"], `${c.ch}: st`).toContain(c.st);
    }
  });

  it("mỗi path là SVG path 300×300 bắt đầu bằng M", () => {
    for (const c of STUDIO_CHARS) {
      for (const p of c.p) expect(p.startsWith("M"), `${c.ch}: ${p.slice(0, 12)}`).toBe(true);
    }
  });
});
