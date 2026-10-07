import { describe, expect, it } from "vitest";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

describe("hanzi-studio data generated", () => {
  it("đúng 214 bộ thủ", () => {
    expect(RADICAL_INDEX).toHaveLength(214);
  });
  it("core đúng 50 bộ", () => {
    expect(RADICAL_INDEX.filter((r) => r.core)).toHaveLength(50);
  });
  it("cat hợp lệ cho mọi bộ", () => {
    for (const r of RADICAL_INDEX) {
      expect(["human", "nature", "animal", "other"]).toContain(r.cat);
    }
  });
  it("bộ thông dụng có data nét + chữ corpus", () => {
    const ch = (c: string) => RADICAL_INDEX.find((r) => r.char === c)!;
    expect(ch("口")!.strokeChar).toBe("口");
    expect(ch("口")!.chars.length).toBeGreaterThan(2);
    expect(ch("水")!.chars.some((c) => c.ch === "没")).toBe(true);
    // Data thật của script build dùng chính ký tự Kangxi làm strokeChar cho 手
    expect(ch("手")!.strokeChar).toBe("手");
  });
  it("char-meta khớp chars của index", () => {
    for (const r of RADICAL_INDEX) for (const c of r.chars) expect(CHAR_META[c.ch]).toEqual(c);
  });
  it("pinyin không dấu số ( MMC format có tone mark )", () => {
    expect(CHAR_META["没"]?.py).toMatch(/^[a-züéèěàáìǐùǔūǔōóǒāǎīíú]*$/u);
  });
});
