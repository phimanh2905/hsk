/* CLI: pnpm tsx scripts/content/build-shadowing-from-youtube.ts [--id X] [--resume]
   Sinh drizzle/seeds/content-shadowing-w1.sql (chỉ bảng subtitles) từ pipeline Whisper.
   KHÔNG chứa dữ liệu nhaihsk; audio trung gian gitignored (out/).
   --resume: với video đã có out/<id>/pinyin.json → dựng lại câu từ whisper.json
   + pinyin.json có sẵn, không gọi lại yt-dlp/whisper/python. */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { readCuratedVideos } from "./video-config";
import { transcribeVideo, flattenWhisperJson, type TokenizedSentence } from "./transcribe-video";
import { splitSentences } from "./split-sentences";
import { buildSentenceParts, type WordPinyin } from "./pinyin-parts";

export type SubtitleRow = {
  n: number;
  start: number;
  end: number;
  parts: { zh: string }[];
  pinyin: string;
  vi: string;
};

// words: 1 WordPinyin (py = mọi âm tiết của câu, theo TokenizedSentence) hoặc mảng per-word (dễ test)
type SentenceInput = Omit<TokenizedSentence, "words"> & { words: WordPinyin | WordPinyin[] };

export function sentenceToRow(n: number, s: SentenceInput): SubtitleRow {
  const words = (Array.isArray(s.words) ? s.words : [s.words]) as WordPinyin[];
  const { parts, pinyin } = buildSentenceParts(s.zh, words);
  return { n, start: s.start, end: s.end, parts, pinyin, vi: "" };
}

export function buildSeedSql(rows: { videoId: string; sentences: SubtitleRow[] }[]): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  return rows
    .map(
      ({ videoId, sentences }) =>
        `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(videoId)}', '${esc(JSON.stringify(sentences))}');\n`
    )
    .join("");
}

// resume: dựng lại TokenizedSentence[] từ out/<id>/ đã có (không gọi tiến trình ngoài)
async function cachedSentences(dir: string): Promise<TokenizedSentence[]> {
  const tokens = flattenWhisperJson(await readFile(`${dir}/whisper.json`, "utf8"));
  const sentences = splitSentences(tokens);
  const wordPinyin = JSON.parse(await readFile(`${dir}/pinyin.json`, "utf8")) as WordPinyin[];
  return sentences.map((s, i) => ({ zh: s.zh, start: s.start, end: s.end, words: wordPinyin[i] ?? { zh: s.zh, py: [] } }));
}

async function buildSeed(videoIds?: string[]): Promise<void> {
  const resume = process.argv.includes("--resume");
  const onlyId =
    videoIds?.length === 1
      ? videoIds[0]
      : process.argv.includes("--id")
        ? process.argv[process.argv.indexOf("--id") + 1]
        : undefined;
  const curated = readCuratedVideos().filter((v) => !onlyId || v.videoId === onlyId);
  const outRoot = new URL("./out/", import.meta.url).pathname;
  const sqlPath = new URL("../../drizzle/seeds/content-shadowing-w1.sql", import.meta.url).pathname;
  // chạy toàn bộ → reset file; chạy 1 video → chỉ ghi header nếu file chưa có
  if (!onlyId || !existsSync(sqlPath))
    writeFileSync(sqlPath, "-- Seed subtitles W1 (whisper) — sinh tự động, đừng sửa tay.\n", { flag: "w" });
  for (const v of curated) {
    const dir = `${outRoot}${v.videoId}`;
    const sents: TokenizedSentence[] =
      resume && existsSync(`${dir}/pinyin.json`)
        ? await cachedSentences(dir)
        : await transcribeVideo(v.videoId);
    const sentences = sents.map((s, i) => sentenceToRow(i + 1, s));
    // chạy 1 video: thay thế dòng cũ của video đó (không nhân đôi)
    if (onlyId && existsSync(sqlPath)) {
      const lines = readFileSync(sqlPath, "utf8").split("\n").filter((l) => l !== "" && !l.includes(`'${v.videoId}'`));
      writeFileSync(sqlPath, `${lines.join("\n")}\n`);
    }
    appendFileSync(sqlPath, buildSeedSql([{ videoId: v.videoId, sentences }]));
    console.log(`${v.videoId}: ${sentences.length} câu`);
  }
}

// chỉ chạy CLI khi invoked trực tiếp, không khi được import để test
if (process.argv[1]?.includes("build-shadowing-from-youtube")) {
  buildSeed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
export { buildSeed };
