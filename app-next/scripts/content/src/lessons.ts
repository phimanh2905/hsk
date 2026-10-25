/* Chia bài vocab theo chủ đề (W2.3): LLM gom nhóm hanzi thành bài 15–25 từ/bài,
   validateSplit thuần kiểm tra điều kiện, generateSplit retry kèm message lỗi.
   Pure logic — CLI ở gen-lessons.mts. */
import { chatJson, type ChatMessage, type LlmConfig } from "./llm";

export type Lesson = { title: string; hanziList: string[] };
export type LessonSplit = Lesson[];

export const MIN_LESSON = 15;
export const MAX_LESSON = 25;
export const MIN_LAST = 8;
export const MAX_ATTEMPTS = 5;

/* validate thuần — throw message rõ ràng:
   - mọi hanzi xuất hiện đúng 1 lần (không thiếu, không trùng, không ngoài danh sách)
   - bài đầu ≥ 15, mọi bài ≤ 25, cho phép bài cuối ≥ 8 (bài thường ≥ 15)
   - title khác rỗng, không trùng
   - tổng số từ === expectedTotal (CLI truyền EXPECTED_CUMULATIVE[level]) */
export function validateSplit(
  _level: number,
  allHanzi: string[],
  split: LessonSplit,
  expectedTotal: number = allHanzi.length
): void {
  if (!Array.isArray(split) || split.length === 0) {
    throw new Error("validateSplit: split rỗng — không có bài nào");
  }
  // title
  const seenTitles = new Set<string>();
  for (let i = 0; i < split.length; i++) {
    const t = (split[i]!.title ?? "").trim();
    if (t === "") throw new Error(`validateSplit: title rỗng tại bài ${i + 1}`);
    if (seenTitles.has(t)) throw new Error(`validateSplit: title trùng "${t}" (bài ${i + 1})`);
    seenTitles.add(t);
  }
  // đúng 1 lần (kiểm tra trước số từ để message thiếu/trùng rõ ràng)
  const count = new Map<string, number>();
  for (const lesson of split) {
    for (const h of lesson.hanziList) count.set(h, (count.get(h) ?? 0) + 1);
  }
  const missing = allHanzi.filter((h) => !count.has(h));
  if (missing.length > 0) {
    throw new Error(
      `validateSplit: thiếu ${missing.length} từ: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "..." : ""}`
    );
  }
  const extra = [...count.keys()].filter((h) => !allHanzi.includes(h));
  if (extra.length > 0) {
    throw new Error(
      `validateSplit: có từ ngoài danh sách: ${extra.slice(0, 20).join(", ")}${extra.length > 20 ? "..." : ""}`
    );
  }
  const dup = [...count.entries()].filter(([, c]) => c > 1);
  if (dup.length > 0) {
    throw new Error(
      `validateSplit: từ xuất hiện nhiều lần: ${dup.slice(0, 20).map(([h, c]) => `${h} x${c}`).join(", ")}`
    );
  }
  // số từ mỗi bài
  for (let i = 0; i < split.length; i++) {
    const n = split[i]!.hanziList.length;
    if (n > MAX_LESSON) {
      throw new Error(`validateSplit: bài ${i + 1} có ${n} từ > ${MAX_LESSON}`);
    }
    const minHere = i === split.length - 1 ? Math.min(MIN_LAST, MIN_LESSON) : MIN_LESSON;
    // bài đầu và bài thường ≥ 15; chỉ bài cuối được ≥ 8
    if (i === 0 && n < MIN_LESSON) {
      throw new Error(`validateSplit: bài đầu có ${n} từ < ${MIN_LESSON}`);
    }
    if (i > 0 && i < split.length - 1 && n < MIN_LESSON) {
      throw new Error(`validateSplit: bài ${i + 1} có ${n} từ < ${MIN_LESSON}`);
    }
    if (i === split.length - 1 && split.length > 1 && n < minHere) {
      throw new Error(`validateSplit: bài cuối có ${n} từ < ${MIN_LAST}`);
    }
  }
  const total = [...count.values()].reduce((a, b) => a + b, 0);
  if (total !== expectedTotal) {
    throw new Error(`validateSplit: tổng số từ ${total} != ${expectedTotal}`);
  }
}
/* Prompt gom nhóm theo chủ đề đời thường phù hợp level; thứ tự danh sách = thứ tự dataset. */
export function buildLessonPrompt(level: number, allHanzi: string[]): ChatMessage[] {
  const system = [
    `Bạn là giáo viên tiếng Trung soạn giáo trình HSK ${level} cho người Việt học.`,
    `Nhận một danh sách từ Hán (đã đếm số lượng) và chia thành các bài học, gom nhóm theo CHỦ ĐỀ ĐỜI THƯỜNG phù hợp trình độ HSK ${level} (ví dụ: gia đình, ăn uống, mua sắm, đi lại, học tập, công việc, sức khỏe, thời tiết...).`,
    `Ràng buộc BẮT BUỘC:`,
    `- Mỗi bài từ ${MIN_LESSON} đến ${MAX_LESSON} từ; chỉ bài CUỐI cùng được phép ít hơn, tối thiểu ${MIN_LAST} từ.`,
    `- Dùng ĐỦ và CHÍNH XÁC các từ trong danh sách, mỗi từ xuất hiện ĐÚNG 1 LẦN — không bỏ, không thêm, không trùng.`,
    `- Giữ nguyên thứ tự các từ trong mỗi bài theo thứ tự xuất hiện trong danh sách đã cho.`,
    `- title: tên chủ đề tiếng Việt, ngắn gọn, KHÔNG trùng nhau.`,
    `Trả về DUY NHẤT một JSON object dạng:`,
    `{"lessons":[{"title":"...","hanziList":["你好","谢谢",...]}]}`,
    `KHÔNG giải thích thêm.`
  ].join("\n");
  const user = `Danh sách ${allHanzi.length} từ HSK ${level}:\n${JSON.stringify(allHanzi)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

/* parse response LLM thành LessonSplit (chỉ shape, chưa validate điều kiện). */
export function parseLessonResponse(data: unknown): LessonSplit {
  const lessons = (data as { lessons?: unknown })?.lessons;
  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error("parseLessonResponse: response không có \"lessons\" là mảng khác rỗng");
  }
  return lessons.map((l, i) => {
    const o = l as { title?: unknown; hanziList?: unknown };
    if (typeof o.title !== "string" || !Array.isArray(o.hanziList)) {
      throw new Error(`parseLessonResponse: bài ${i + 1} thiếu title/hanziList hợp lệ`);
    }
    const hanziList = o.hanziList.map((h, j) => {
      if (typeof h !== "string" || h.trim() === "") {
        throw new Error(`parseLessonResponse: bài ${i + 1} hanziList[${j}] không phải string khác rỗng`);
      }
      return h;
    });
    return { title: o.title, hanziList };
  });
}

export type GenerateSplitOpts = {
  fetchImpl?: typeof fetch;
  expectedTotal?: number;
  maxAttempts?: number;
  onAttempt?: (attempt: number, messages: ChatMessage[]) => void;
};

/* Gọi LLM -> parse -> validateSplit; fail thì retry tối đa maxAttempts lần,
   message lỗi được nối vào prompt. Vẫn fail -> throw (CLI exit 1). */
export async function generateSplit(
  cfg: LlmConfig,
  level: number,
  allHanzi: string[],
  opts: GenerateSplitOpts = {}
): Promise<LessonSplit> {
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const expectedTotal = opts.expectedTotal ?? allHanzi.length;
  let messages: ChatMessage[] = buildLessonPrompt(level, allHanzi);
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    opts.onAttempt?.(attempt, messages);
    const data = await chatJson<unknown>(cfg, messages, {
      retries: 0,
      fetchImpl: opts.fetchImpl
    });
    try {
      const split = parseLessonResponse(data);
      validateSplit(level, allHanzi, split, expectedTotal);
      return split;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      messages = [
        ...buildLessonPrompt(level, allHanzi),
        {
          role: "user",
          content: `Lần thử trước bị lỗi sau đây, hãy sửa và trả lại JSON đúng ràng buộc:\n${lastError}`
        }
      ];
    }
  }
  throw new Error(`generateSplit: thất bại sau ${maxAttempts} lần thử — lỗi cuối: ${lastError}`);
}
