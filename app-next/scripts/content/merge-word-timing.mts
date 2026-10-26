/* CLI: pnpm tsx scripts/content/merge-word-timing.mts
   Đọc out/<videoId>/whisper.json + pinyin.json của 20 video curated (W1) →
   gắn words: [{zh, py, startMs, endMs}] vào từng sentence → sinh
   drizzle/seeds/content-shadowing-wsd.sql (INSERT OR REPLACE vào
   content_shadowing_subtitles — JSON mode, không migration).
   KHÔNG chứa dữ liệu curated của đối thủ; timing tự sinh whisper. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readCuratedVideos } from "./video-config.ts";
import { flattenWhisperJson } from "./transcribe-video.ts";
import { splitSentences, type SentenceDraft } from "./split-sentences.ts";
import { buildSentenceParts, type WordPinyin } from "./pinyin-parts.ts";
import type { ShadowWord } from "../../src/content/shadowing.ts";

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const countCJK = (s: string) => Array.from(s).filter((c) => CJK_RE.test(c)).length;

/** Ghép word-token vào 1 câu: mỗi token tiêu thụ countCJK(zh) âm tiết từ py. */
export function wordsForSentence(draft: SentenceDraft, py: string[]): ShadowWord[] {
  let k = 0; // con trỏ âm tiết
  const out: ShadowWord[] = [];
  for (const t of draft.tokens) {
    const zh = t.text.replace(/[。？！?!;.,，、：:—…\s]/g, "");
    if (zh === "") continue;
    if (t.start < draft.start - 0.01 || t.end > draft.end + 0.01) continue; // word ngoài câu → bỏ
    const need = countCJK(zh);
    const syll = py.slice(k, k + need);
    k += need;
    out.push({ zh, py: syll.join(" "), startMs: Math.round(t.start * 1000), endMs: Math.round(t.end * 1000) });
  }
  return out;
}

function buildSeedSql(): string {
  const esc = (s: string) => s.replace(/'/g, "''").replace(/;/g, "\\u003b"); // wrangler tách statement theo ';'
  const rows: string[] = [];
  for (const v of readCuratedVideos()) {
    const dir = new URL(`./out/${v.videoId}/`, import.meta.url).pathname;
    if (!existsSync(`${dir}whisper.json`) || !existsSync(`${dir}pinyin.json`)) {
      console.warn(`${v.videoId}: thiếu whisper/pinyin — bỏ qua`);
      continue;
    }
    const tokens = flattenWhisperJson(readFileSync(`${dir}whisper.json`, "utf8"));
    const drafts = splitSentences(tokens);
    const pinyinBySentence = JSON.parse(readFileSync(`${dir}pinyin.json`, "utf8")) as WordPinyin[];
    const sentences = drafts.map((d, i) => {
      const prev = pinyinBySentence[i] ?? { zh: d.zh, py: [] };
      const words = wordsForSentence(d, prev.py ?? []);
      // parts/pinyin giữ nguyên shape seed W1 (buildSentenceParts — cụm từ theo dấu câu,
      // pinyin hoa chữ đầu), KHÔNG tách từng ký tự.
      const { parts, pinyin } = buildSentenceParts(d.zh, [prev]);
      return { n: i + 1, start: d.start, end: d.end, parts, pinyin, vi: "", words };
    });
    rows.push(`INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(v.videoId)}', '${esc(JSON.stringify(sentences))}');`);
    console.log(`${v.videoId}: ${sentences.length} câu, words đầu: ${JSON.stringify(sentences[0]?.words?.[0] ?? null)}`);
  }
  return rows.join("\n") + "\n";
}

if (process.argv[1]?.includes("merge-word-timing")) {
  const outPath = new URL("../../drizzle/seeds/content-shadowing-wsd.sql", import.meta.url).pathname;
  writeFileSync(outPath, "-- Seed word timing WSD (whisper W1) — sinh tự động, đừng sửa tay.\n" + buildSeedSql());
  console.log("đã ghi " + outPath);
}
