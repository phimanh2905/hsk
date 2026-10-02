/* Port 1:1 từ clone/js/dictionary.js — search 3 kiểu: chữ Hán / pinyin không dấu / nghĩa Việt substring. */
import { stripTones } from "@/lib/pinyin-utils";
import type { DictEntry } from "@/content/dictionary";

export function isCJK(s: string): boolean {
  return /[\u3400-\u9fff]/.test(s);
}
export function pyJoin(entry: Pick<DictEntry, "pinyinPerChar">): string {
  return entry.pinyinPerChar.join(" ");
}
export function searchEntries(entries: DictEntry[], raw: string): DictEntry[] {
  const q = String(raw || "").trim();
  if (!q) return [];
  const nq = stripTones(q).replace(/\s+/g, "");
  const nqs = stripTones(q);
  const vi = q.toLowerCase();
  return entries.filter((e) => {
    if (isCJK(q)) return e.hanzi.indexOf(q) !== -1;
    const py = stripTones(pyJoin(e)).replace(/\s+/g, "");
    if (nq && py.indexOf(nq) !== -1) return true;
    const pySp = stripTones(pyJoin(e));
    if (nqs && pySp.indexOf(nqs) !== -1) return true;
    return e.meanings.some((m) => m.toLowerCase().indexOf(vi) !== -1);
  });
}
