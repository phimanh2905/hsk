import { stripTones } from "@/lib/pinyin-utils";

const STRIP_RE = /[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/g;
export function normDict(s: string): string {
  return stripTones(s).replace(STRIP_RE, "");
}
export function diffNormalized(src: string, want: string): { char: string; ok: boolean | null }[] {
  const wantNorm = normDict(want);
  const marks: boolean[] = [];
  for (let i = 0; i < Math.max(wantNorm.length, normDict(src).length); i++) marks.push(normDict(src)[i] === wantNorm[i]);
  const out: { char: string; ok: boolean | null }[] = [];
  let oi = 0;
  for (const ch of Array.from(src.trim())) {
    const nch = normDict(ch);
    if (nch === "") { out.push({ char: ch, ok: null }); continue; }
    out.push({ char: ch, ok: marks[oi] !== false });
    oi += nch.length;
  }
  return out;
}
