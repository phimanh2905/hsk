/* Ghép câu zh + per-word pinyin (pypinyin lazy_pinyin) thành shape parts/pinyin
   của content_shadowing_subtitles.sentences. Thuần, không I/O. */
export type WordPinyin = { zh: string; py: string[] };
export type SentenceParts = { parts: { zh: string }[]; pinyin: string };

const CJK = /[\u4e00-\u9fff]/;
const PUNCT = /[,，。！？!?;；、：:—…]/;

export function buildSentenceParts(zh: string, words: WordPinyin[]): SentenceParts {
  const flat = words.flatMap((w) => w.py);
  const parts: { zh: string }[] = [];
  const syl: string[] = [];
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  let pyIdx = 0;
  // Duyệt từng ký tự của 1 cụm: đẩy pinyin khi gặp ký tự CJK,
  // dấu câu đính vào token trước; ký tự khác (số, latin — python
  // errors="ignore" đã bỏ) được bỏ qua, không crash.
  const pinyinOf = (seg: string, isStartOfSentence: boolean): string => {
    const out: string[] = [];
    for (const ch of seg) {
      if (CJK.test(ch)) {
        const s = flat[pyIdx++];
        if (s) out.push(s);
      } else if (PUNCT.test(ch)) {
        const ascii = ch === "，" ? "," : ch === "。" ? "." : ch === "！" ? "!" : ch === "？" ? "?" : ch === "；" ? ";" : ch === "、" ? "," : ch;
        if (out.length) out[out.length - 1] += ascii;
        else out.push(ascii);
      }
      // ký tự khác: bỏ qua
    }
    const joined = out.join(" ");
    return isStartOfSentence ? cap(joined) : joined;
  };
  // Tách parts theo dấu , ， 。 ！ ？ !
  const segs = zh.match(/[^,，。！？!]*[,，。！？!]?/g)?.filter((s) => s !== "") ?? [zh];
  segs.forEach((seg, i) => {
    parts.push({ zh: seg });
    syl.push(pinyinOf(seg, i === 0));
  });
  return { parts, pinyin: syl.join(" ").replace(/\s+([,，。！？!])/g, "$1") };
}
