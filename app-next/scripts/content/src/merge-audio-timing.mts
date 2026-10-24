/* merge-audio-timing (W3.3): gắn timing TTS vào dialogues + sinh static content.

Đọc data/dialogues/timing-hskN.json (từ render-dialogue-audio.py) + data/dialogues/dialogues-hskN.json,
gán vào từng line: `audio: "<book>/<lesson>-<n>"` (đường dẫn tương đối tới public/, không có "/" đầu)
và `durSec` (giây, đã làm tròn 2 chữ số phía render), rồi:
1. Ghi đè lại dialogues-hskN.json (lines giữ nguyên thứ tự, bổ sung 2 field).
2. Sinh src/content/dialogues.ts — `export const dialogueByLesson = {...} as const;`
   Types được KHAI BÁO TRỰC TIẾP trong file sinh ra (không import từ scripts/) theo
   pattern gen-vocab-static: object literal thuần, chạy lại là ghi đè toàn bộ file.

KHÔNG chạy trong build/CI — tool thủ công.

Usage: pnpm dlx tsx scripts/content/src/merge-audio-timing.mts --level 1..3
  [--data <dir>] [--out <dialogues.ts>]   (fixture test: --data trỏ thư mục tạm)
Mặc định: data=scripts/content/data/dialogues, out=src/content/dialogues.ts.
*/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../../.."); // scriptDir = scripts/content/src → app-next

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? i + 1 < process.argv.length ? process.argv[i + 1] : undefined : undefined;
}

const levelsArg = argValue("--level") ?? "1,2,3";
const levels = levelsArg.split(",").map((s) => parseInt(s, 10));
if (levels.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
  console.error("--level phải là 1..5, ví dụ --level 1,2,3");
  process.exit(1);
}
const dataDir = argValue("--data") ?? path.join(scriptDir, "../data/dialogues");
const outPath = argValue("--out") ?? path.join(appRoot, "src/content/dialogues.ts");

type Line = {
  n: number;
  speaker: "A" | "B";
  zh: string;
  pinyin: string;
  vi: string;
  audio?: string;
  durSec?: number;
};
type DialogueRec = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  lines: Line[];
};
type TimingLine = { n: number; durSec: number };
type TimingMap = { [key: string]: TimingLine[] };

const AUDIO_RE = /^hsk[1-5]\/lesson-\d+-\d+$/;

for (const level of levels) {
  const dialoguesPath = path.join(dataDir, `dialogues-hsk${level}.json`);
  const timingPath = path.join(dataDir, `timing-hsk${level}.json`);
  if (!existsSync(dialoguesPath)) {
    console.error(`Không tìm thấy ${dialoguesPath} — chạy gen-dialogues.mts trước`);
    process.exit(1);
  }
  if (!existsSync(timingPath)) {
    console.error(`Không tìm thấy ${timingPath} — chạy render-dialogue-audio.py --level ${level} trước`);
    process.exit(1);
  }
  const records = JSON.parse(readFileSync(dialoguesPath, "utf8")) as DialogueRec[];
  const timing = JSON.parse(readFileSync(timingPath, "utf8")) as TimingMap;

  let merged = 0;
  for (const rec of records) {
    const key = `${rec.book}/${rec.lesson}`;
    const lines = timing[key];
    if (!Array.isArray(lines)) {
      console.warn(`cảnh báo: ${key} không có trong timing-hsk${level}.json — bỏ qua bài này`);
      continue;
    }
    const durByN = new Map(lines.map((t) => [t.n, t.durSec]));
    for (const line of rec.lines) {
      const dur = durByN.get(line.n);
      if (dur === undefined) {
        throw new Error(`${key} line ${line.n}: thiếu timing — render chưa đủ file`);
      }
      if (!(dur > 0)) {
        throw new Error(`${key} line ${line.n}: durSec không hợp lệ (${dur})`);
      }
      const audio = `${key}-${line.n}`;
      if (!AUDIO_RE.test(audio)) throw new Error(`audio id không hợp lệ: ${audio}`);
      line.audio = audio;
      line.durSec = dur;
      merged++;
    }
  }

  writeFileSync(dialoguesPath, JSON.stringify(records, null, 2) + "\n", "utf8");
  console.log(`dialogues-hsk${level}.json: gắn audio+durSec cho ${merged} line (${records.length} bài)`);
}

/* ===== Sinh src/content/dialogues.ts ===== */
const allRecords: DialogueRec[] = [];
const seenIds = new Set<string>();
for (const level of levels) {
  const records = JSON.parse(
    readFileSync(path.join(dataDir, `dialogues-hsk${level}.json`), "utf8")
  ) as DialogueRec[];
  for (const rec of records) {
    if (seenIds.has(rec.id)) throw new Error(`id trùng: ${rec.id}`);
    seenIds.add(rec.id);
    allRecords.push(rec);
  }
}

const file = `/* AUTO-GENERATED bởi scripts/content/src/merge-audio-timing.mts (W3.3) — KHÔNG sửa tay.
   Nguồn: data/dialogues/dialogues-hskN.json (gen-dialogues) + timing-hskN.json
   (render-dialogue-audio.py: Kokoro zf_001/zm_009, mp3 24kHz mono).
   Line audio = "<book>/<lesson>-<n>" tương đối tới public/ (pages tự prefix).
   Types khai báo tại đây để src không phụ thuộc scripts/. */

export type DialogueLine = {
  n: number;
  speaker: "A" | "B";
  zh: string;
  pinyin: string;
  vi: string;
  audio: string;
  durSec: number;
};

export type DialogueRecord = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  lines: DialogueLine[];
};

export const dialogueByLesson = {
${allRecords
  .map((rec) => `  ${JSON.stringify(rec.id)}: ${JSON.stringify(rec)},`)
  .join("\n")}
} as const;
`;
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, file, "utf8");
console.log(`ghi ${outPath} (${allRecords.length} bài)`);
