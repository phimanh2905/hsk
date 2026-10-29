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

/* Ngược lại: parse âm tiết có dấu ("bà") hoặc số ("ba4") thành (base, tone).
   Không digit → tone 5; digit phải là 1-5; base phải chỉ gồm a-z hoặc ü
   (giữ nguyên ký tự ü, không đổi thành nv/u: — khớp dạng dữ liệu pinyinValid). */
const TONE_MARKS = /[\u0300\u0301\u0304\u030C]/g;
const MARK_TO_TONE: Record<string, Tone> = {
  "\u0304": 1, "\u0301": 2, "\u030C": 3, "\u0300": 4,
};

export function parseTone(syllable: string): { base: string; tone: Tone } | null {
  const m = /(\d)$/.exec(syllable);
  if (m) {
    const t = Number(m[1]);
    if (t < 1 || t > 5) return null;
    const base = syllable.slice(0, -1);
    if (!/^[a-zü]+$/.test(base)) return null;
    return { base, tone: t as Tone };
  }
  const nfd = syllable.normalize("NFD");
  let tone: Tone = 5;
  for (const c of nfd) if (MARK_TO_TONE[c]) tone = MARK_TO_TONE[c];
  const base = nfd.replace(TONE_MARKS, "").normalize("NFC");
  if (!/^[a-zü]+$/.test(base)) return null;
  return { base, tone };
}
