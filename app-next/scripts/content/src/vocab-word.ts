/* buildWord — port 1:1 logic perChar/W từ src/content/vocab.ts (hàm private ở đó). */
import { toPinyin } from "../../../src/lib/pinyin-utils";
import type { PinyinPerChar, VocabWord } from "../../../src/content/vocab";

/* exPy: mỗi âm tiết/ký tự cách nhau bởi dấu cách, khớp 1-1 với từng ký tự của exZh */
const PUNCT = /[，。？！、：；…—]/;

function perChar(exZh: string, exPy: string): PinyinPerChar[] {
  const chars = Array.from(exZh);
  const pys = exPy.trim().split(/\s+/);
  return chars.map((c, i) => {
    if (PUNCT.test(c)) return { c: c, py: c };
    return { c: c, py: pys[i] ? toPinyin(pys[i]) : "" };
  });
}

/* pinyin có số -> tự chuyển thành dấu; không có số -> giữ nguyên (vd "Wáng lǎoshī") */
export function buildWord(
  hanzi: string,
  pinyin: string,
  hanViet: string,
  meaning: string,
  pos: string,
  exZh: string,
  exPy: string,
  exVi: string
): VocabWord {
  return {
    hanzi: hanzi,
    pinyin: /\d/.test(pinyin) ? toPinyin(pinyin) : pinyin,
    hanViet: hanViet,
    meaning: meaning,
    pos: pos,
    example: { zh: exZh, pinyinPerChar: perChar(exZh, exPy), vi: exVi }
  };
}
