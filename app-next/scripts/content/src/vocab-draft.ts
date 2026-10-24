/* Prompt build + parse/validate response vocab draft (W2.2).
   Consumes: llm.extractJson; zod vocabWordSchema; buildWord. */
import { z } from "zod";
import { extractJson } from "./llm";
import { buildWord } from "./vocab-word";
import { vocabWordSchema } from "../../../src/content/schema";
import type { VocabWord } from "../../../src/content/vocab";

const POS_VALUES = [
  "Danh từ", "Động từ", "Tính từ", "Phó từ", "Đại từ", "Số từ",
  "Lượng từ", "Trợ từ", "Liên từ", "Thán từ", "Hậu tố", "Cụm từ"
] as const;

const CHUNK_SIZE = 20;

export type ChunkItem = { hanzi: string; pinyin: string };

export function buildVocabPrompt(level: number, chunk: ChunkItem[]): { role: "system" | "user"; content: string }[] {
  const system = [
    `Bạn là giáo viên tiếng Trung soạn từ vựng HSK ${level} cho người Việt học.`,
    `Nhận một danh sách từ (hanzi + pinyin) và trả về DUY NHẤT một JSON object dạng {"words":[...]} (response format json_object), mỗi phần tử có các field:`,
    `- hanzi: từ Hán (nguyên văn như đã cho)`,
    `- hanViet: âm Hán Việt chuẩn, viết CHỮ IN HOA (vd "NHĨ HẢO")`,
    `- meaning: nghĩa tiếng Việt, ngắn gọn tối đa 12 từ`,
    `- pos: từ loại, MỘT trong: ${POS_VALUES.join("/")}`,
    `- exZh: một câu tiếng Trung ngắn dùng đúng từ, mức độ khó phù hợp HSK ${level}`,
    `- exPy: pinyin của câu ví dụ kèm số thanh điệu 1-5, mỗi âm tiết cách nhau dấu cách, dấu câu tách bằng dấu cách, khớp 1-1 ký tự với exZh (dấu câu chụp nguyên)`,
    `- exVi: dịch tiếng Việt của câu ví dụ`,
    `Trả từng từ theo đúng thứ tự danh sách, không bỏ từ, không thêm từ ngoài danh sách.`,
    `Cấm chép nội dung từ bất kỳ nguồn có bản quyền (giáo trình, website, sách) — chỉ dùng kiến thức ngôn ngữ của bạn.`
  ].join("\n");

  const user = JSON.stringify(chunk.map(({ hanzi, pinyin }) => ({ hanzi, pinyin })));
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

/* extractJson -> buildWord từng item -> assert thứ tự/đủ số lượng, pinyinPerChar 1-1, pos hợp lệ. */
export function parseVocabResponse(level: number, chunk: ChunkItem[], content: string): VocabWord[] {
  void level; // mức độ khó được ép ở prompt; giữ tham số theo interface
  const parsed = extractJson(content) as { words?: unknown };
  const rawWords = parsed?.words;
  if (!Array.isArray(rawWords)) {
    throw new Error(`parseVocabResponse: response không có "words" là mảng`);
  }
  if (rawWords.length !== chunk.length) {
    const got = rawWords.map((w) => (w as { hanzi?: string })?.hanzi ?? "?");
    const missing = chunk.filter((c, i) => !got.slice(i).includes(c.hanzi) && !got.includes(c.hanzi));
    throw new Error(
      `parseVocabResponse: LLM trả ${rawWords.length}/${chunk.length} từ — thiếu: ${missing.map((m) => m.hanzi).join(", ")}`
    );
  }

  const out: VocabWord[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const raw = rawWords[i] as Record<string, unknown>;
    if (raw.hanzi !== chunk[i].hanzi) {
      throw new Error(
        `parseVocabResponse: sai thứ tự tại index ${i} — expected "${chunk[i].hanzi}", got "${String(raw.hanzi)}"`
      );
    }
    const pos = String(raw.pos ?? "");
    if (!(POS_VALUES as readonly string[]).includes(pos)) {
      throw new Error(`parseVocabResponse: pos không hợp lệ "${pos}" tại index ${i} ("${chunk[i].hanzi}")`);
    }
    let word: VocabWord;
    try {
      word = vocabWordSchema.parse(
        buildWord(
          String(raw.hanzi),
          String(raw.pinyin ?? "") || chunk[i].pinyin, // LLM bỏ pinyin -> dùng pinyin của chunk
          String(raw.hanViet ?? ""),
          String(raw.meaning ?? ""),
          pos,
          String(raw.exZh ?? ""),
          String(raw.exPy ?? ""),
          String(raw.exVi ?? "")
        )
      );
    } catch (err) {
      throw new Error(`parseVocabResponse: item ${i} ("${chunk[i].hanzi}") không hợp lệ: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (word.example.pinyinPerChar.length !== Array.from(word.example.zh).length) {
      throw new Error(
        `parseVocabResponse: pinyinPerChar (${word.example.pinyinPerChar.length}) không khớp 1-1 exZh (${Array.from(word.example.zh).length}) tại index ${i} ("${chunk[i].hanzi}")`
      );
    }
    const PUNCT = /[，。？！、：；…—]/;
    const emptyPy = word.example.pinyinPerChar.filter((p) => !PUNCT.test(p.c) && p.py.trim() === "");
    if (emptyPy.length > 0) {
      throw new Error(
        `parseVocabResponse: pinyinPerChar thiếu pinyin cho ${emptyPy.map((p) => p.c).join("")} tại index ${i} ("${chunk[i].hanzi}")`
      );
    }
    out.push(word);
  }
  return out;
}

export { CHUNK_SIZE };
