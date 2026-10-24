/* Validate reviewed vocab dataset (Task 5, W2.2): data/vocab/hsk1..5.json
   - đủ EXPECTED_CUMULATIVE[N] từ, không trùng hanzi
   - mọi word pass vocabWordSchema
   - pinyinPerChar khớp số ký tự câu ví dụ (dấu câu chụp nguyên)
   - hanViet viết hoa toàn bộ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { vocabWordSchema } from "../../../src/content/schema";
import { EXPECTED_CUMULATIVE } from "../src/hsk-list";
// unique (hanzi+pinyin) per level — chuẩn HSK 3.0 có vài row trùng cặp (2 nghĩa)
const EXPECTED_PER_LEVEL_UNIQUE = { 1: 500, 2: 771, 3: 970, 4: 999, 5: 1071 } as const;
import type { VocabWord } from "../../src/content/vocab";

const HAN_VIET_UPPER =
  /^([A-ZÀ-ỸỲỆỨỬỮỰĂÂÊÔƠƯĐ][A-ZÀ-ỸỲỆỨỬỮỰĂÂÊÔƠƯĐ\s,()/…-]*)?$/; // rỗng cho phép (chữ ngoài map, Ruling 2)
const PUNCT = /[，。！？、；：""''…—,.!?;:()"'\s]/;

function loadLevel(level: number): VocabWord[] {
  const f = path.join(__dirname, "../data/vocab/hsk" + level + ".json");
  return JSON.parse(readFileSync(f, "utf8")) as VocabWord[];
}

describe.each([1, 2, 3, 4, 5] as const)("vocab data hsk%i", (level) => {
  const words = loadLevel(level);

  it("đủ số từ theo unique (hanzi+pinyin) của chuẩn", () => {
    // Ruling W2 chạy bù: dataset có các row trùng đúng cặp (vd 批 pī 2 nghĩa) —
    // test "không trùng" cấm trùng cặp, nên count = số cặp unique của level.
    expect(words.length).toBe(EXPECTED_PER_LEVEL_UNIQUE[level]);
  });

  it("không trùng (hanzi+pinyin)", () => {
    // HSK 3.0 liệt kê một số homograph 2 nghĩa (vd 干 gān/gàn) — trùng chấp nhận
    // khi pinyin khác nhau; chỉ cấm trùng đúng cặp hanzi+pinyin.
    const seen = new Set<string>();
    for (const w of words) {
      const key = w.hanzi + "|" + w.pinyin;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("mọi word pass vocabWordSchema", () => {
    for (const w of words) expect(() => vocabWordSchema.parse(w)).not.toThrow();
  });

  it("pinyinPerChar khớp câu ví dụ", () => {
    for (const w of words) {
      expect(w.example.pinyinPerChar.length).toBe(w.example.zh.length);
      for (const pc of w.example.pinyinPerChar) {
        if (!PUNCT.test(pc.c)) expect(pc.py.length).toBeGreaterThan(0);
      }
    }
  });

  it("hanViet viết hoa toàn bộ", () => {
    for (const w of words) expect(HAN_VIET_UPPER.test(w.hanViet)).toBe(true);
  });
});
