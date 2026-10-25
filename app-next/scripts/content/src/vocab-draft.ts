/* Prompt build + parse/validate response vocab draft (W2.2, Ruling 1+2).
   LLM chỉ sinh: hanzi (echo), meaning, pos, exZh, exVi.
   pinyin: từ dataset CSV; pinyinPerChar: pypinyin (python bridge);
   hanViet: bảng hanvietData per-char — đều DETERMINISTIC, không tin LLM. */
import { z } from "zod";
import { extractJson } from "./llm";
import { derivePinyinBatch, pyPerChar, hanVietOf, type CharPy } from "./pinyin-derive";
import { vocabWordSchema } from "../../../src/content/schema";
import type { PinyinPerChar, VocabWord } from "../../../src/content/vocab";

const POS_VALUES = [
  "Danh từ", "Động từ", "Tính từ", "Phó từ", "Đại từ", "Số từ",
  "Lượng từ", "Trợ từ", "Liên từ", "Thán từ", "Hậu tố", "Cụm từ"
] as const;

export const CHUNK_SIZE = 20;

export type ChunkItem = { hanzi: string; pinyin: string };

export function buildVocabPrompt(level: number, chunk: ChunkItem[]): { role: "system" | "user"; content: string }[] {
  const system = [
    `Bạn là giáo viên tiếng Trung soạn từ vựng HSK ${level} cho người Việt học.`,
    `Nhận một danh sách từ Hán và trả về DUY NHẤT một JSON object dạng {"words":[...]} (response format json_object), mỗi phần tử chỉ cần các field:`,
    `- hanzi: từ Hán, nguyên văn như đã cho`,
    `- meaning: nghĩa tiếng Việt, ngắn gọn tối đa 12 từ`,
    `- pos: từ loại, MỘT trong: ${POS_VALUES.join("/")}`,
    `- exZh: một câu tiếng Trung ngắn dùng đúng từ, mức độ khó phù hợp HSK ${level}`,
    `- exVi: dịch tiếng Việt của câu ví dụ`,
    `Trả từng từ theo đúng thứ tự danh sách, không bỏ từ, không thêm từ ngoài danh sách.`,
    `KHÔNG cần pinyin hay âm Hán Việt — hệ thống tự sinh. Cấm chép nội dung từ bất kỳ nguồn có bản quyền (giáo trình, website, sách) — chỉ dùng kiến thức ngôn ngữ của bạn.`
  ].join("\n");

  const user = JSON.stringify(chunk.map(({ hanzi }) => ({ hanzi })));
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

const rawWordSchema = z.object({
  hanzi: z.string().min(1),
  meaning: z.string().min(1),
  pos: z.string().min(1),
  exZh: z.string().min(1),
  exVi: z.string().min(1)
});

export type RawWord = z.infer<typeof rawWordSchema>;

/* validate phần LLM: đếm, thứ tự, pos, non-empty. Pure — không derive, dễ test. */
export function validateRawResponse(chunk: ChunkItem[], content: string): RawWord[] {
  const parsed = extractJson(content) as { words?: unknown };
  const rawWords = parsed?.words;
  if (!Array.isArray(rawWords)) {
    throw new Error(`parseVocabResponse: response không có "words" là mảng`);
  }
  if (rawWords.length !== chunk.length) {
    const got = rawWords.map((w) => (w as { hanzi?: string })?.hanzi ?? "?");
    const missing = chunk.filter((c) => !got.includes(c.hanzi));
    throw new Error(
      `parseVocabResponse: LLM trả ${rawWords.length}/${chunk.length} từ — thiếu: ${missing.map((m) => m.hanzi).join(", ")}`
    );
  }
  return rawWords.map((raw, i) => {
    const w = raw as Record<string, unknown>;
    if (w.hanzi !== chunk[i].hanzi) {
      throw new Error(
        `parseVocabResponse: sai thứ tự tại index ${i} — expected "${chunk[i].hanzi}", got "${String(w.hanzi)}"`
      );
    }
    const v = rawWordSchema.safeParse(w);
    if (!v.success) {
      const issue = v.error.issues[0];
      throw new Error(
        `parseVocabResponse: field "${issue?.path.join(".")}" lỗi tại index ${i} ("${chunk[i].hanzi}")`
      );
    }
    if (!(POS_VALUES as readonly string[]).includes(v.data.pos)) {
      throw new Error(`parseVocabResponse: pos không hợp lệ "${v.data.pos}" tại index ${i} ("${chunk[i].hanzi}")`);
    }
    return v.data;
  });
}

/* derive pinyinPerChar + hanViet cho raw words — 1 lần gọi python bridge cho
   [...hanzi, ...exZh]. opts.rows: inject rows đã derive (unit test stub). */
export async function assembleWords(
  chunk: ChunkItem[],
  raws: RawWord[],
  opts?: { rows?: CharPy[][] }
): Promise<VocabWord[]> {
  const zhList = [...chunk.map((c) => c.hanzi), ...raws.map((r) => r.exZh)];
  const rows = opts?.rows ?? (await derivePinyinBatch(zhList)).perCharRows ?? [];
  const used = opts?.rows ?? rows;
  const n = chunk.length;
  const out: VocabWord[] = [];
  for (let i = 0; i < n; i++) {
    const hanziRows = used[i];
    const exRows = used[n + i];
    if (!hanziRows || !exRows) throw new Error(`assembleWords: thiếu rows derive tại index ${i}`);
    const perChar: PinyinPerChar[] = pyPerChar(exRows);
    out.push({
      hanzi: chunk[i].hanzi,
      pinyin: chunk[i].pinyin,
      hanViet: hanVietOf(hanziRows),
      meaning: raws[i].meaning,
      pos: raws[i].pos,
      example: { zh: raws[i].exZh, pinyinPerChar: perChar, vi: raws[i].exVi }
    });
  }
  // validate nới: hanViet cho phép "" (chữ ngoài map — Ruling 2), còn lại full schema
  for (const w of out) {
    if (w.hanViet === "") continue;
    vocabWordSchema.parse(w);
  }
  return out;
}

/* entry point CLI: content string từ chatJson -> validate raw -> assemble */
export async function parseVocabResponse(
  chunk: ChunkItem[],
  content: string,
  opts?: { rows?: CharPy[][] }
): Promise<VocabWord[]> {
  const raws = validateRawResponse(chunk, content);
  return assembleWords(chunk, raws, opts);
}

/* Re-derive các word cũ (schema cũ có pinyin/hanViet/pinyinPerChar LLM-sinh) theo
   convention mới: pinyin lấy từ dataset (pinyinByHanzi, fallback giữ pinyin cũ),
   per-char + hanViet derive deterministic. Chunk DONE cũ không cần chạy lại LLM. */
export async function rederiveWords(
  words: VocabWord[],
  pinyinByHanzi: Map<string, string>,
  opts?: { rows?: CharPy[][] }
): Promise<VocabWord[]> {
  const zhList = [...words.map((w) => w.hanzi), ...words.map((w) => w.example.zh)];
  const rows = opts?.rows ?? (await derivePinyinBatch(zhList)).perCharRows ?? [];
  const used = opts?.rows ?? rows;
  const n = words.length;
  return words.map((w, i) => {
    const hanziRows = used[i];
    const exRows = used[n + i];
    if (!hanziRows || !exRows) throw new Error(`rederiveWords: thiếu rows tại index ${i}`);
    return {
      hanzi: w.hanzi,
      pinyin: pinyinByHanzi.get(w.hanzi) ?? w.pinyin,
      hanViet: hanVietOf(hanziRows),
      meaning: w.meaning,
      pos: w.pos,
      example: { zh: w.example.zh, pinyinPerChar: pyPerChar(exRows), vi: w.example.vi }
    };
  });
}
