/* Data model cho Bảng Pinyin 405 âm tiết. Tất cả thuần tĩnh từ pinyin.ts
   (seed source — KHÔNG sửa file đó). Cột = final có ít nhất 1 ô, xếp theo
   thứ tự pinyinFinals; "-i" (zhi-class) không có trong pinyinValid nên tự loại. */
import { pinyinExamples, pinyinFinals, pinyinInitials, pinyinValid } from "@/content/pinyin";

export interface SyllableCell {
  initial: string;
  final: string;
  base: string;
  hasExample: boolean;
}

export const SYLLABLE_CELL_COUNT = 405;

export function buildSyllableTable() {
  const cells = new Map<string, SyllableCell>();
  for (const [initial, finals] of Object.entries(pinyinValid)) {
    for (const [final, base] of Object.entries(finals)) {
      cells.set(`${initial}|${final}`, { initial, final, base, hasExample: base in pinyinExamples });
    }
  }
  const present = new Set(Object.values(pinyinValid).flatMap((m) => Object.keys(m)));
  const finals = pinyinFinals.filter((f) => present.has(f));
  return { initials: [...pinyinInitials], finals, cells };
}

export function examplesFor(base: string): [string, string, string][] {
  return (pinyinExamples[base] ?? []).slice(0, 4);
}
