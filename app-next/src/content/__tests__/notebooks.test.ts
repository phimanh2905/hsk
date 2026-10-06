import { describe, expect, it } from "vitest";
import { notebooks } from "@/content/notebooks";
import { vocab } from "@/content/vocab";

/* MOCK_ROWS chỉ để hiển thị khi sổ tay chưa có rows thật — không được drift
   khỏi vocab.ts (nguồn chuẩn, cũng là nguồn seed D1). */
describe("notebooks samples (MOCK_ROWS)", () => {
  const vocabByHanzi = new Map<string, { pinyin: string; hanViet: string; meaning: string }>();
  for (const pages of Object.values(vocab)) {
    for (const lesson of Object.values(pages)) {
      for (const w of lesson.words) {
        if (!vocabByHanzi.has(w.hanzi)) {
          vocabByHanzi.set(w.hanzi, { pinyin: w.pinyin, hanViet: w.hanViet, meaning: w.meaning });
        }
      }
    }
  }

  it("mọi sample row trùng vocab.ts đều có pinyin/hanViet/meaning giống hệt", () => {
    for (const cfg of Object.values(notebooks)) {
      for (const s of cfg.samples) {
        for (const row of s.rows) {
          const w = vocabByHanzi.get(row.hanzi);
          if (!w) continue; // từ không có trong vocab.ts → bỏ qua
          expect(row.pinyin, `${row.hanzi}.pinyin`).toBe(w.pinyin);
          expect(row.hanviet, `${row.hanzi}.hanviet`).toBe(w.hanViet);
          expect(row.meaning, `${row.hanzi}.meaning`).toBe(w.meaning);
        }
      }
    }
  });

  it("ít nhất 8/12 từ MOCK_ROWS tồn tại trong vocab.ts (đảm bảo test có ý nghĩa)", () => {
    const rows = notebooks.vocab.samples.flatMap((s) => s.rows);
    const found = rows.filter((r) => vocabByHanzi.has(r.hanzi)).length;
    expect(found).toBeGreaterThanOrEqual(8);
  });
});
