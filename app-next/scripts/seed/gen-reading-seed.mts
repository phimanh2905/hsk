/* Sinh drizzle/seeds/content-readings.sql từ data/reading/passages-hsk{1..5}.json
   + data/reading/audio-index.json (tùy chọn, đầu ra của render-reading-audio.py).
   Idempotent: INSERT OR REPLACE theo PK (id). ord tăng dần per level.
   audio-index thiếu (hoặc thiếu câu) → audio null, durSec 0 (player fallback TTS).
   Chạy: pnpm dlx tsx scripts/seed/gen-reading-seed.mts (từ app-next/) */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ReadingPassage = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  sentences: { zh: string; py: string; vi: string }[];
  vocab: { word: string; py: string; vi: string }[];
  questions: {
    q: string;
    qVi: string;
    options: string[];
    answer: number;
    evidence?: { si: number; s: number; e: number }[];
  }[];
};
export type ReadingAudioIndex = Record<
  string,
  { sentences: { audio: string; durSec: number }[] }
>;

const esc = (s: string) => s.replace(/'/g, "''");

/* JSON column: escape ' như SQL, đồng thời mã hoá ';' thành \u003b — wrangler
   chia statement theo ';' nên ';' trong chuỗi JSON làm đứt statement (bug seed 243/300). */
const jsonCol = (v: unknown) =>
  JSON.stringify(v).replace(/'/g, "\\u0027").replace(/;/g, "\\u003b");

/* Tổng ký tự Hán (\p{Script=Han}) — bỏ dấu câu/latin/số. */
export const countHanChars = (zh: string): number =>
  (zh.match(/\p{Script=Han}/gu) ?? []).length;

export function readingSqlRows(
  passages: ReadingPassage[],
  audioIndex: ReadingAudioIndex | null,
): string[] {
  const ordByLevel = new Map<string, number>();
  return passages.map((p) => {
    const level = p.book; // "hsk1".."hsk5"
    const ord = ordByLevel.get(level) ?? 0;
    ordByLevel.set(level, ord + 1);

    const idx = audioIndex?.[p.id]?.sentences ?? [];
    const sentences = p.sentences.map((s, i) => ({
      zh: s.zh,
      py: s.py,
      vi: s.vi,
      audio: idx[i]?.audio ?? null,
      durSec: idx[i]?.durSec ?? 0,
    }));
    const chars = p.sentences.reduce((n, s) => n + countHanChars(s.zh), 0);
    const durationSec = Math.round(sentences.reduce((n, s) => n + s.durSec, 0));
    const audioDir = `audio/reading/${p.id}`;

    return `INSERT OR REPLACE INTO content_readings (id, level, ord, title, title_vi, sentences, vocab, questions, audio_dir, chars, duration_sec) VALUES ('${esc(p.id)}', '${esc(level)}', ${ord}, '${esc(p.title)}', '${esc(p.titleVi)}', '${esc(jsonCol(sentences))}', '${esc(jsonCol(p.vocab))}', '${esc(jsonCol(p.questions))}', '${esc(audioDir)}', ${chars}, ${durationSec});`;
  });
}

function loadPassages(level: number): ReadingPassage[] {
  const f = path.join("scripts/content/data/reading", `passages-hsk${level}.json`);
  if (!existsSync(f)) {
    console.error(`Thiếu ${f} — chạy gen-reading.mts --level ${level} trước`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(f, "utf8")) as ReadingPassage[];
}

function main(): void {
  const lines: string[] = [
    "-- Seed content_readings — sinh tự động, đừng sửa tay. Chạy lại gen-reading-seed.mts để cập nhật.",
  ];

  const idxPath = "scripts/content/data/reading/audio-index.json";
  const audioIndex: ReadingAudioIndex | null = existsSync(idxPath)
    ? (JSON.parse(readFileSync(idxPath, "utf8")) as ReadingAudioIndex)
    : null;
  if (!audioIndex) {
    console.log("Không có audio-index.json — seed với audio null / durSec 0 (fallback TTS).");
  }

  let total = 0;
  for (let level = 1; level <= 5; level++) {
    const passages = loadPassages(level);
    lines.push(...readingSqlRows(passages, audioIndex));
    total += passages.length;
    console.log(`HSK ${level}: ${passages.length} bài`);
  }

  mkdirSync("drizzle/seeds", { recursive: true });
  writeFileSync("drizzle/seeds/content-readings.sql", lines.join("\n") + "\n");
  console.log(`Đã ghi ${total} rows -> drizzle/seeds/content-readings.sql`);
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) main();
