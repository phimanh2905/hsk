import { describe, it, expect } from "vitest";
import { pinyinInitials, pinyinFinals, pinyinValid } from "../pinyin";
import { radicals } from "../radicals";
import { strokeRules, lastStrokes } from "../strokeRules";
import { soundRulesData } from "../soundrules";

describe("pinyin data", () => {
  it("22 thanh mẫu, 37 vận mẫu, đủ 405 âm hợp lệ", () => {
    expect(pinyinInitials).toHaveLength(22);
    expect(pinyinFinals).toHaveLength(37);
    const cells = Object.values(pinyinValid).flatMap((f) => Object.values(f));
    expect(cells).toHaveLength(405);
    expect(pinyinValid["Ø"]["i"]).toBe("yi"); // Ø hàng: i -> yi
    expect(pinyinValid["j"]["u"]).toBeUndefined(); // j không ghép u
  });
});

describe("radicals data", () => {
  it("đủ 214 bộ, nhóm số nét đúng (1 nét 6 bộ, 2 nét 25 bộ)", () => {
    expect(radicals).toHaveLength(214);
    expect(radicals.filter((r) => r.strokes === 1)).toHaveLength(6);
    expect(radicals.filter((r) => r.strokes === 2)).toHaveLength(23); // Kangxi chuẩn: 2 nét có 23 bộ (brief ghi 25 — sai)
    expect(radicals[0]).toMatchObject({ i: 1, char: "一", hanViet: "Nhất" });
  });
});

describe("stroke rules", () => {
  it("7 quy tắc đúng chữ ví dụ + 3 nét cuối", () => {
    expect(strokeRules.map((r) => r.chars[0])).toEqual(["爸", "月", "们", "国", "区", "夫", "女"]);
    expect(lastStrokes.map((s) => s.glyph)).toEqual(["辶", "廴", "ㄑ"]);
  });
});

describe("sound rules data", () => {
  it("bảng thanh điệu 6 hàng, quiz 5 câu", () => {
    expect(soundRulesData.toneRows).toHaveLength(6);
    expect(soundRulesData.toneRows[0]).toMatchObject({ name: "Ngang", count: 3094 });
    expect(soundRulesData.toneRows[0].tones[0]).toEqual({ label: "thanh 1", mark: "ā", pct: 61 });
    expect(soundRulesData.quiz).toHaveLength(5);
    expect(soundRulesData.note).toContain("9721");
  });
});
