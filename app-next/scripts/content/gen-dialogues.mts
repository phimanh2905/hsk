/* CLI gen-dialogues (W3.1): sinh hội thoại LLM cho từng bài lessons-hskN.json,
   1 request/bài, validate qua validateDialogue (Task 1) — retry kèm message lỗi
   tối đa 5 lần/bài, ghi từng bài vào data/dialogues/dialogues-hskN.json
   (append/skip bài đã có theo id khi chạy lại). KHÔNG chạy trong build/CI — tool thủ công.

   Usage: pnpm dlx tsx scripts/content/gen-dialogues.mts --level 1..5 [--lesson lesson-1] [--retry] [--lessons <path>] [--out <path>]
     --lesson: chỉ chạy 1 bài (id dạng "lesson-1")
     --lessons/--out: đường dẫn thay thế (fixture test)
   Env: .env.local (app-next) + process.env -> CONTENT_LLM_BASE_URL/KEY/MODEL. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chatJson, llmConfigFromEnv, type ChatMessage, type LlmConfig } from "./src/llm";
import { dialogueId, validateDialogue, type DialogueRecord } from "./src/dialogues";
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
  console.error("Usage: pnpm dlx tsx scripts/content/gen-dialogues.mts --level 1..5 [--lesson lesson-1] [--retry] [--lessons <path>] [--out <path>]");
  process.exit(1);
}
const level = parseInt(levelStr, 10);
const book = `hsk${level}`;
const onlyLesson = argValue("--lesson");
const forceRetry = process.argv.includes("--retry");
const lessonsPath = argValue("--lessons") ?? path.join(scriptDir, `data/vocab/lessons-hsk${level}.json`);
const outPath = argValue("--out") ?? path.join(scriptDir, `data/dialogues/dialogues-hsk${level}.json`);

type Lesson = { title: string; hanziList: string[] };
type VocabEntry = { hanzi: string; pinyin: string; meaning: string };

if (!existsSync(lessonsPath)) {
  console.error(`Không tìm thấy lessons input: ${lessonsPath} — chạy gen-lessons.mts trước`);
  process.exit(1);
}
const lessons = JSON.parse(readFileSync(lessonsPath, "utf8")) as Lesson[];

// vocabSet: cumulative hanzi hsk1..level (điều kiện OOV warning) + vocab chi tiết cho prompt
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

// Bài đã có trong output -> skip (id trùng); existing avoid cho prompt
const existing: DialogueRecord[] = existsSync(outPath)
  ? (JSON.parse(readFileSync(outPath, "utf8")) as DialogueRecord[])
  : [];
const doneIds = new Set(existing.map((d) => d.id));

const env = { ...readEnvFile(path.join(appRoot, ".env.local")), ...process.env } as Record<string, string>;
const cfg = llmConfigFromEnv(env);

function buildDialoguePrompt(
  level: number,
  lessonIndex: number,
  lesson: Lesson,  avoid: string[]
): ChatMessage[] {
  const vocab = lesson.hanziList.map((hz) => {
    const v = vocabByHanzi.get(hz);
    return { zh: hz, pinyin: v?.pinyin ?? "", vi: v?.meaning ?? "" };
  });
  const system = [
    `Bạn là giáo viên tiếng Trung soạn hội thoại mẫu HSK ${level} cho người Việt học.`,
    `Soạn MỘT hội thoại cho bài "${lesson.title}" (bài ${lessonIndex + 1}) với yêu cầu:`,
    `- 8–15 câu, 2 vai "A" và "B" thay phiên nhau (A nói trước), mỗi vai một nhân vật`,
    `- MỖI CÂU CHỈ dùng từ nằm trong độ phủ vocab của bài + từ đã học ở các HSK level trước đó`,
    `- Mỗi câu: zh (chữ Hán), pinyin (PÍNH CÓ DẤU THANH — KHÔNG dùng tone number kiểu "ni3"), vi (dịch tiếng Việt tự nhiên)`,
    `- Nội dung tự nhiên, gần gũi đời sống, bám chủ đề của bài`,
    `Trả về DUY NHẤT một JSON object dạng: {"title":"tiêu đề tiếng Anh ngắn","titleVi":"tiêu đề tiếng Việt","lines":[{"n":1,"speaker":"A","zh":"...","pinyin":"...","vi":"..."}]} — n đánh số từ 1 liên tiếp. Không chép nội dung có bản quyền.`
  ].join("\n");
  const user = JSON.stringify({ lessonIndex: lessonIndex + 1, lessonTitle: lesson.title, vocab, avoid });
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

function parseDialogue(
  data: unknown,
  lessonId: string
): { record: DialogueRecord; errors: string[]; oov: string[] } | { error: string } {
  const obj = data as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) return { error: "response không phải object" };
  if (!Array.isArray(obj.lines)) return { error: 'response thiếu "lines" là mảng' };
  const raw = {
    id: dialogueId(book, lessonId),
    book,
    lesson: lessonId,
    title: String(obj.title ?? ""),
    titleVi: String(obj.titleVi ?? ""),
    lines: obj.lines
  };
  const r = validateDialogue(raw, vocabSet);
  return { record: raw as unknown as DialogueRecord, errors: r.errors, oov: r.oov };
}

mkdirSync(path.dirname(outPath), { recursive: true });
let okCount = 0;
let failCount = 0;

for (let idx = 0; idx < lessons.length; idx++) {
  const lesson = lessons[idx]!;
  const lessonId = `lesson-${idx + 1}`;
  if (onlyLesson !== undefined && lessonId !== onlyLesson) continue;
  const id = dialogueId(book, lessonId);
  if (doneIds.has(id) && !forceRetry) {
    console.log(`skip ${lessonId} (đã có trong output)`);
    continue;
  }

  const basePrompt = buildDialoguePrompt(level, idx, lesson, existing.map((d) => d.id));
  let messages = basePrompt;
  let saved = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    process.stdout.write(`${lessonId} "${lesson.title}" (lần ${attempt}) -> LLM... `);
    let data: unknown;
    try {
      data = await chatJson<unknown>(cfg, messages);
    } catch (err) {
      console.log(`lỗi: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const parsed = parseDialogue(data, lessonId);
    if ("error" in parsed) {
      console.log(`lỗi: ${parsed.error}`);
      messages = [...basePrompt, { role: "user", content: `Lần trước bị lỗi: ${parsed.error}. Sửa lại, trả JSON đúng dạng yêu cầu.` }];
      continue;
    }
    if (parsed.errors.length > 0) {
      console.log(`không hợp lệ: ${parsed.errors.join("; ")}`);
      messages = [...basePrompt, { role: "user", content: `Lần trước hội thoại vi phạm: ${parsed.errors.join("; ")}. Sửa lại cho đúng yêu cầu.` }];
      continue;
    }
    existing.push(parsed.record);
    doneIds.add(id);
    writeFileSync(outPath, JSON.stringify(existing.filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i), null, 2));
    console.log(`ok (${parsed.record.lines.length} câu${parsed.oov.length > 0 ? `, OOV: ${parsed.oov.join("")}` : ""})`);
    saved = true;
    break;
  }
  if (saved) {
    okCount++;
  } else {
    failCount++;
    console.error(`bỏ qua ${lessonId} — hết ${MAX_ATTEMPTS} lần thử`);
  }
}

console.log(`Xong HSK ${level}: ${okCount} bài ok, ${failCount} fail -> ${outPath}`);
if (failCount > 0) process.exit(1);
