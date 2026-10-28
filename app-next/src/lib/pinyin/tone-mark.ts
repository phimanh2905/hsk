/* Đặt dấu thanh lên nguyên âm chính của âm tiết pinyin. Pure — dùng cho
   Bảng Pinyin (/pinyin/bang-am); dữ liệu gốc pinyinValid là âm không dấu.
   Quy tắc: iu → u (liú), ui → i (duì); còn lại ưu tiên a > o > e > ü > i > u. */
export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<Exclude<Tone, 5>, string> = {
  1: "\u0304", 2: "\u0301", 3: "\u030C", 4: "\u0300",
};

function mainVowelIndex(s: string): number {
  if (/iu$/.test(s)) return s.length - 1;
  if (/ui$/.test(s)) return s.length - 1;
  for (const v of ["a", "o", "e", "ü", "i", "u"]) {
    const i = s.indexOf(v);
    if (i >= 0) return i;
  }
  return -1;
}

export function applyTone(syllable: string, tone: Tone): string {
  if (tone === 5) return syllable;
  const s = syllable.normalize("NFC");
  const i = mainVowelIndex(s);
  if (i < 0) return s;
  return (s.slice(0, i) + s[i] + MARKS[tone] + s.slice(i + 1)).normalize("NFC");
}

export function toneForms(base: string): [string, string, string, string, string] {
  return ([1, 2, 3, 4, 5] as const).map((t) => applyTone(base, t)) as [
    string, string, string, string, string,
  ];
}
