/* Chấm điểm "honest mock" (spec §9): theo nhịp & độ dài bản ghi, KHÔNG phải
   chấm thanh điệu thật. Dựa trên công thức stopRec() của mock, đã hiệu chỉnh
   để thỏa đồng thời (controller ruling — test thắng):
     1. scoreFor(3.3, 6, 1, false) ≥ 85   (đúng độ dài kỳ vọng → điểm cao)
     2. scoreFor(0.2, 6, 1, false) === 55 (quá ngắn → closeness chạm 0, raw = 55)
     3. scoreFor(a,b,c,true) === scoreFor(a,b,c,false) + 4 - 6
        (giữ cấu trúc bonus `(simMode ? 4 : 6)`)
     4. clamp [55, 98]

   Công thức cuối cùng:
     expect    = max(2, (zhLen * 0.55) / rate)
     ratio     = recordSecs / expect
     dev       = |1 - ratio|
     closeness = max(0, 1 - dev * 1.1)          // hệ số 1.1 (trước là 0.9)
                 → quá lệch nhịp (ratio ≤ ~0.09 hoặc ≥ ~1.91) thì closeness = 0
     raw       = 49 + closeness * 30 + (simMode ? 4 : 6)   // base 49 (trước là 62)
     score     = clamp(round(raw), 55, 98)
   Kiểm tra 4 tính chất:
     - ratio=1 → closeness=1 → raw = 49+30+6 = 85 (nonsim) ✓
     - ratio≈0.06 → dev≈0.94 → closeness=0 → raw = 55 → clamp giữ 55 ✓
     - sim chỉ đổi hạng tử cuối 6→4 nên chênh lệch luôn -2 = (4-6) ✓
     - clamp [55,98] giữ nguyên ✓ */
export function scoreFor(recordSecs: number, zhLen: number, rate: number, simMode: boolean): number {
  const expect = Math.max(2, (zhLen * 0.55) / rate);
  const ratio = recordSecs / expect;
  const dev = Math.abs(1 - ratio);
  const closeness = Math.max(0, 1 - dev * 1.1);
  return Math.max(55, Math.min(98, Math.round(49 + closeness * 30 + (simMode ? 4 : 6))));
}

export function toneChipsFor(score: number, parts: string[]): { zh: string; ok: boolean }[] {
  return parts.map((zh, i) => ({
    zh,
    ok: score >= 80 ? true : score >= 70 ? i % 3 !== 2 : i % 2 === 0,
  }));
}
