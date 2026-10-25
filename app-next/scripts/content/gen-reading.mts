/* CLI gen-reading (W3 T8): sinh reading passages qua LLM cho từng level,
   1 request/passage, validate qua validateReadingPassage (Task 8) — retry kèm
   message lỗi tối đa 5 lần/passage, ghi vào data/reading/passages-hskN.json
   (append theo stt; passage đã có skip khi chạy lại). KHÔNG chạy trong build/CI —
   tool thủ công, KHÔNG chạy trong test.

   Mỗi passage gắn lesson = bài vốn đã học xong level đó, xoay vòng theo stt
   (stt 1 -> lesson-1, stt 4 -> lesson-1 lại...).

   Usage: pnpm dlx tsx scripts/content/gen-reading.mts --level 1..5 [--count 3] [--retry <id>] [--lessons <path>] [--out <path>]
     --count: số passage sinh trong lần chạy này (mặc định 3)
     --retry <id>: regenerate đúng passage id (bản mới thay bản cũ)
     --lessons/--out: đường dẫn thay thế (fixture test)
   Env: .env.local (app-next) + process.env -> CONTENT_LLM_BASE_URL/KEY/MODEL. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chatJson, llmConfigFromEnv, type ChatMessage } from "./src/llm";
import {
  readingId,
  upsertPassage,
  validateReadingPassage,
  type ReadingPassageRecord
} from "./src/reading";
import { readEnvFile } from "./src/read-env";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");
const MAX_ATTEMPTS = 5;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const levelStr = argValue("--level");
if (!levelStr || !/^[1-5]$/.test(levelStr)) {
  console.error("Usage: pnpm dlx tsx scripts/content/gen-reading.mts --level 1..5 [--count 3] [--retry <id>] [--lessons <path>] [--out <path>]");
  process.exit(1);
}
const level = parseInt(levelStr, 10);
const book = `hsk${level}`;
const count = Math.max(1, parseInt(argValue("--count") ?? "3", 10) || 3);
const retryId = argValue("--retry");
const lessonsPath = argValue("--lessons") ?? path.join(scriptDir, `data/vocab/lessons-hsk${level}.json`);
const outPath = argValue("--out") ?? path.join(scriptDir, `data/reading/passages-hsk${level}.json`);

type Lesson = { title: string; hanziList: string[] };
type VocabEntry = { hanzi: string; pinyin: string; meaning: string };

if (!existsSync(lessonsPath)) {
  console.error(`Không tìm thấy lessons input: ${lessonsPath} — chạy gen-lessons.mts trước`);
  process.exit(1);
}
const lessons = JSON.parse(readFileSync(lessonsPath, "utf8")) as Lesson[];

const env = { ...readEnvFile(path.join(appRoot, ".env.local")), ...process.env } as Record<string, string>;
const cfg = llmConfigFromEnv(env);

// vocabSet: cumulative hanzi hsk1..level (điều kiện OOV warning)
const vocabByHanzi = new Map<string, VocabEntry>();
const vocabSet = new Set<string>();
for (let lv = 1; lv <= level; lv++) {
  const vp = path.join(scriptDir, `data/vocab/hsk${lv}.json`);
  if (!existsSync(vp)) {
    console.warn(`cảnh báo: thiếu ${vp} — vocabSet sẽ thiếu từ level ${lv}`);
    continue;
  }
  for (const w of JSON.parse(readFileSync(vp, "utf8")) as VocabEntry[]) {
    vocabByHanzi.set(w.hanzi, w);
    vocabSet.add(w.hanzi);
  }
}

// Passage đã có trong output -> giữ nguyên stt; --retry thay đúng id
const existing: ReadingPassageRecord[] = existsSync(outPath)
  ? (JSON.parse(readFileSync(outPath, "utf8")) as ReadingPassageRecord[])
  : [];
const maxStt = existing.reduce((m, p) => Math.max(m, parseInt(p.id.split("-").pop() ?? "0", 10) || 0), 0);

function buildPassagePrompt(stt: number, lessonIndex: number, avoid: string[]): ChatMessage[] {
  const lesson = lessons[lessonIndex]!;
  const lessonId = `lesson-${lessonIndex + 1}`;
  const vocab = lesson.hanziList.map((hz) => {
    const v = vocabByHanzi.get(hz);
    return { zh: hz, pinyin: v?.pinyin ?? "", vi: v?.meaning ?? "" };
  });
  const system = [
    `Bạn là giáo viên tiếng Trung soạn bài đọc (reading passage) HSK ${level} cho người Việt học.`,
    `Soạn MỘT bài đọc liền mạch cho bài "${lesson.title}" (${lessonId}) với yêu cầu:`,
    `- 12–20 câu kể/narrative mạch lạc, một câu chuyện hoặc đoạn văn tự nhiên (KHÔNG dạng hội thoại A/B)`,
    `- MỖI CÂU CHỈ dùng từ nằm trong độ phủ vocab của bài + từ đã học ở các HSK level trước đó`,
    `- Mỗi câu: zh (chữ Hán), py (pinyin CÓ DẤU THANH — KHÔNG dùng tone number kiểu "ni3"), vi (dịch tiếng Việt tự nhiên)`,
    `- vocab: 5–8 từ vựng đáng chú ý của bài (word/py/vi)`,
    `- questions: 3–5 câu hỏi hiểu bài; mỗi câu ĐÚNG 3 options; câu hỏi phải trả lời được từ nội dung bài; answer là index 0–2 trỏ đúng option đúng`,
    `Trả về DUY NHẤT một JSON object dạng: {"title":"tiêu đề tiếng Anh ngắn","titleVi":"tiêu đề tiếng Việt","sentences":[{"zh":"...","py":"...","vi":"..."}],"vocab":[{"word":"...","py":"...","vi":"..."}],"questions":[{"q":"...","qVi":"...","options":["...","...","..."],"answer":0}]} — không chép nội dung có bản quyền.`
  ].join("\n");
  const user = JSON.stringify({ level, lessonId, lessonTitle: lesson.title, vocab, avoid });
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

mkdirSync(path.dirname(outPath), { recursive: true });
let okCount = 0;
let failCount = 0;

for (let i = 0; i < count; i++) {
  const stt = maxStt + i + 1;
  const id = readingId(book, stt);
  const lessonIndex = (stt - 1) % lessons.length; // xoay vòng theo stt
  if (retryId !== undefined && retryId !== id) continue;
  if (existing.some((p) => p.id === id) && retryId === undefined) {
    console.log(`skip ${id} (đã có trong output)`);
    continue;
  }

  const basePrompt = buildPassagePrompt(stt, lessonIndex, existing.map((p) => p.id));
  let messages = basePrompt;
  let saved = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    process.stdout.write(`${id} (lesson-${lessonIndex + 1}, lần ${attempt}) -> LLM... `);
    let data: unknown;
    try {
      data = await chatJson<unknown>(cfg, messages);
    } catch (err) {
      console.log(`lỗi: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const obj = data as Record<string, unknown>;
    const raw = {
      id,
      book,
      lesson: `lesson-${lessonIndex + 1}`,
      title: typeof obj?.title === "string" ? obj.title : "",
      titleVi: typeof obj?.titleVi === "string" ? obj.titleVi : "",
      sentences: obj?.sentences,
      vocab: obj?.vocab,
      questions: obj?.questions
    };
    const r = validateReadingPassage(raw, vocabSet, stt);
    if (r.errors.length > 0) {
      console.log(`không hợp lệ: ${r.errors.join("; ")}`);
      messages = [...basePrompt, { role: "user", content: `Lần trước vi phạm: ${r.errors.join("; ")}. Sửa lại cho đúng yêu cầu.` }];
      continue;
    }
    const record = raw as unknown as ReadingPassageRecord;
    const merged = upsertPassage(existing, record);
    existing.length = 0;
    existing.push(...merged);
    writeFileSync(outPath, JSON.stringify(merged, null, 2));
    console.log(`ok (${record.sentences.length} câu${r.oov.length > 0 ? `, OOV: ${r.oov.join("")}` : ""})`);
    saved = true;
    break;
  }
  if (saved) {
    okCount++;
  } else {
    failCount++;
    console.error(`bỏ qua ${id} — hết ${MAX_ATTEMPTS} lần thử`);
  }
}

console.log(`Xong HSK ${level}: ${okCount} passage ok, ${failCount} fail -> ${outPath}`);
if (failCount > 0) process.exit(1);
