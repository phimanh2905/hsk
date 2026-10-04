import { describe, it, expect } from "vitest";
import { STROKE_PATH_DATA, STROKE_DATA } from "../hanzi-strokes";

describe("STROKE_PATH_DATA", () => {
  it("có 爱 và 好, paths/order khớp total", () => {
    expect(Object.keys(STROKE_PATH_DATA)).toEqual(expect.arrayContaining(["爱", "好"]));
    for (const [ch, entry] of Object.entries(STROKE_PATH_DATA)) {
      expect(entry.paths.length).toBe(entry.total);
      expect(entry.order.length).toBe(entry.total);
      expect(entry.py.length).toBeGreaterThan(0);
      expect(entry.rad.name.length).toBeGreaterThan(0);
      for (const p of entry.paths) expect(p.startsWith("M")).toBe(true);
    }
    expect(STROKE_PATH_DATA["爱"].total).toBe(10);
    expect(STROKE_PATH_DATA["好"].total).toBe(6);
  });
  it("STROKE_DATA (polyline) vẫn nguyên vẹn với 你", () => {
    expect(STROKE_DATA["你"].length).toBe(7);
  });
});
