/* Tách câu từ word-timestamps của whisper.cpp (-ojf -ml 1). Thuần, không I/O. */
export type WhisperToken = { text: string; start: number; end: number };
export type SentenceDraft = { zh: string; start: number; end: number; tokens: WhisperToken[] };

const END_PUNCT = /[。？！?!;.]/;

export function splitSentences(
  tokens: WhisperToken[],
  opts?: { maxGap?: number; maxLen?: number }
): SentenceDraft[] {
  const maxGap = opts?.maxGap ?? 1.5;
  const maxLen = opts?.maxLen ?? 60;
  const out: SentenceDraft[] = [];
  let cur: WhisperToken[] = [];
  const flush = () => {
    const withPunct = cur.filter((t) => t.text.trim() !== "");
    if (withPunct.length === 0) { cur = []; return; }
    const zh = cur.map((t) => t.text).join("").replace(/\s+/g, "").trim();
    const content = zh.replace(/[。？！?!;.,，、：:—…]/g, "");
    if (zh === "" || content === "") { cur = []; return; }
    out.push({
      zh,
      start: Math.round(Math.min(...withPunct.map((t) => t.start)) * 10) / 10,
      end: Math.round(Math.max(...withPunct.map((t) => t.end)) * 10) / 10,
      tokens: cur,
    });
    cur = [];
  };
  for (const t of tokens) {
    if (cur.length > 0) {
      const prev = cur[cur.length - 1];
      if (END_PUNCT.test(prev.text) || t.start - prev.end > maxGap || cur.join("").length >= maxLen) flush();
    }
    cur.push(t);
    if (END_PUNCT.test(t.text)) flush();
  }
  flush();
  return out;
}
