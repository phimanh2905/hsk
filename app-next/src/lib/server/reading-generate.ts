/* Generate bài đọc AI từ văn bản tiếng Trung + validate JSON nghiêm.
   Spec: docs/superpowers/specs/2026-10-30-reading-ai-mine-design.md §3, §4.2.
   READING_FAKE_LLM=1 → doc giả deterministic (dev/test/e2e không cần LLM thật). */

import { chatJson, type ChatMessage } from "./llm";

export type DraftSentence = { zh: string; py: string; vi: string };
export type DraftVocabItem = { word: string; py: string; vi: string };
export type DraftQuestion = {
  q: string;
  qVi: string;
  options: string[];
  answer: number;
  evidence: { si: number; s: number; e: number }[];
};
export type DraftDoc = {
  sentences: DraftSentence[];
  vocab: DraftVocabItem[];
  questions: DraftQuestion[];
};

export class DraftValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftValidationError";
  }
}

const SYSTEM_PROMPT = `Bạn là trợ lý giáo dục tiếng Trung. Người dùng sẽ cung cấp một văn bản tiếng Trung.
Hãy trả về DUY NHẨT một object JSON (không kèm văn bản nào khác) với schema:
{
  "sentences": [{"zh": "câu gốc nguyên văn", "py": "pinyin có dấu cho cả câu", "vi": "dịch tiếng Việt tự nhiên"}...],
  "vocab": [{"word": "từ tiếng Trung xuất hiện trong văn bản", "py": "pinyin của từ", "vi": "nghĩa tiếng Việt"}...],
  "questions": [{"q": "câu hỏi tiếng Trung về nội dung", "qVi": "câu hỏi dịch tiếng Việt", "options": ["đáp án tiếng Trung", ...], "answer": <index đúng, 0-based>, "evidence": [{"si": <index câu dẫn chứng>, "s": <offset bắt đầu ký tự trong câu>, "e": <offset kết thúc>}]}]
}
Ràng buộc bắt buộc:
- sentences: tách văn bản thành các câu theo thứ tự, giữ nguyên văn chữ Hán, mỗi câu một phần tử (ít nhất 3 câu).
- vocab: từ 3 đến 12 mục, mỗi từ phải xuất hiện nguyên vẹn trong văn bản.
- questions: từ 3 đến 5 câu hỏi trắc nghiệm; mỗi câu 2–4 lựa chọn; answer là index trong options;
  evidence trỏ vào đoạn văn bản gốc: si là index câu trong sentences, s/e là khoảng ký tự trong sentences[si].zh (0 <= s < e <= độ dài câu).`;

export function assertValidInput(text: string): void {
  const normalized = text.replace(/\s+/g, "");
  if (normalized.length < 100) {
    throw new DraftValidationError("Văn bản quá ngắn (tối thiểu 100 ký tự)");
  }
  if (normalized.length > 3000) {
    throw new DraftValidationError("Văn bản quá dài (tối đa 3000 ký tự)");
  }
  const han = normalized.match(/\p{Script=Han}/gu)?.length ?? 0;
  if (han / normalized.length < 0.3) {
    throw new DraftValidationError("Văn bản chưa đủ tiếng Trung");
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- giữ signature (raw, text) theo plan cho Task sau
export function validateDraftDoc(raw: unknown, _text: string): DraftDoc {
  if (!isRecord(raw)) {
    throw new DraftValidationError("Dữ liệu AI trả về không đúng định dạng");
  }
  const { sentences, vocab, questions } = raw as Record<string, unknown>;

  if (!Array.isArray(sentences) || sentences.length < 3) {
    throw new DraftValidationError("Số câu trong bài đọc không hợp lệ (cần ít nhất 3 câu)");
  }
  const outSentences: DraftSentence[] = [];
  for (const s of sentences) {
    if (
      !isRecord(s) ||
      typeof s.zh !== "string" ||
      typeof s.py !== "string" ||
      typeof s.vi !== "string" ||
      s.zh.trim() === "" ||
      s.py.trim() === "" ||
      s.vi.trim() === ""
    ) {
      throw new DraftValidationError("Câu trong bài đọc thiếu dữ liệu (zh/py/vi)");
    }
    outSentences.push({ zh: s.zh, py: s.py, vi: s.vi });
  }
  const zhLen = outSentences.length;
  if (outSentences.some((s) => !/\p{Script=Han}/u.test(s.zh))) {
    throw new DraftValidationError("Câu trong bài đọc thiếu chữ Hán");
  }

  if (!Array.isArray(vocab) || vocab.length < 3 || vocab.length > 12) {
    throw new DraftValidationError("Số lượng từ vựng không hợp lệ (cần 3–12 từ)");
  }
  const outVocab: DraftVocabItem[] = [];
  for (const v of vocab) {
    if (
      !isRecord(v) ||
      typeof v.word !== "string" ||
      typeof v.py !== "string" ||
      typeof v.vi !== "string" ||
      v.word.trim() === "" ||
      v.py.trim() === "" ||
      v.vi.trim() === ""
    ) {
      throw new DraftValidationError("Từ vựng thiếu dữ liệu (word/py/vi)");
    }
    outVocab.push({ word: v.word, py: v.py, vi: v.vi });
  }

  if (!Array.isArray(questions) || questions.length < 3 || questions.length > 5) {
    throw new DraftValidationError("Số lượng câu hỏi không hợp lệ (cần 3–5 câu)");
  }
  const outQuestions: DraftQuestion[] = [];
  for (const q of questions) {
    if (
      !isRecord(q) ||
      typeof q.q !== "string" ||
      typeof q.qVi !== "string" ||
      !Array.isArray(q.options) ||
      typeof q.answer !== "number" ||
      !Array.isArray(q.evidence)
    ) {
      throw new DraftValidationError("Câu hỏi thiếu dữ liệu (q/qVi/options/answer/evidence)");
    }
    const options = q.options;
    if (options.length < 2 || options.length > 4 || options.some((o) => typeof o !== "string" || o.trim() === "")) {
      throw new DraftValidationError("Số lượng lựa chọn không hợp lệ (cần 2–4 đáp án)");
    }
    const answer = q.answer;
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      throw new DraftValidationError("Đáp án đúng nằm ngoài danh sách lựa chọn");
    }
    const evidence: { si: number; s: number; e: number }[] = [];
    for (const ev of q.evidence) {
      if (!isRecord(ev) || typeof ev.si !== "number" || typeof ev.s !== "number" || typeof ev.e !== "number") {
        throw new DraftValidationError("Evidence thiếu dữ liệu (si/s/e)");
      }
      const { si, s, e } = ev;
      if (!Number.isInteger(si) || si < 0 || si >= zhLen) {
        throw new DraftValidationError("Evidence trỏ vào câu không tồn tại");
      }
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > outSentences[si].zh.length || s >= e) {
        throw new DraftValidationError("Evidence nằm ngoài phạm vi câu văn bản gốc");
      }
      evidence.push({ si, s, e });
    }
    outQuestions.push({ q: q.q, qVi: q.qVi, options: options.map(String), answer, evidence });
  }

  return { sentences: outSentences, vocab: outVocab, questions: outQuestions };
}

function fakeDoc(text: string): DraftDoc {
  const rawSentences =
    text.match(/[^。！？!?…；;]+[。！？!?…；;]*/g)?.map((s) => s.trim()).filter((s) => s.length > 0) ?? [];
  const sentences: DraftSentence[] = rawSentences.map((zh, i) => ({
    zh,
    py: `fake-pinyin-cau-${i}`,
    vi: `Bản dịch giả câu ${i}`,
  }));
  const first = rawSentences[0] ?? "";
  const vocab: DraftVocabItem[] = Array.from({ length: Math.min(4, Math.max(3, first.length)) }, (_, i) => ({
    word: first[i] ?? "字",
    py: `fake-py-${i}`,
    vi: `nghĩa giả ${i}`,
  }));
  const questions: DraftQuestion[] = Array.from({ length: 3 }, (_, i) => ({
    q: `Câu hỏi giả ${i}?`,
    qVi: `Câu hỏi giả dịch ${i}?`,
    options: ["đáp án A", "đáp án B"],
    answer: 0,
    evidence: [{ si: 0, s: 0, e: Math.min(3, sentences[0]?.zh.length ?? 1) }],
  }));
  return { sentences, vocab, questions };
}

export async function generateReading(text: string): Promise<DraftDoc> {
  assertValidInput(text);

  if (process.env.READING_FAKE_LLM === "1") {
    return validateDraftDoc(fakeDoc(text), text);
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: text },
  ];
  // AI_ROUTER (buffproxy smart-router) chọn model mỗi lần gọi — output lệch
  // schema quan sát được ~2/3; 5 lần thử cho xác suất thành công ~87%.
  const MAX_ATTEMPTS = 5;
  let lastRaw = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let parsed: unknown;
    try {
      parsed = await chatJson(messages);
      lastRaw = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    } catch (err) {
      // Thiếu cấu hình LLM là lỗi môi trường: không retry.
      if (err instanceof Error && err.message === "NO_LLM") throw err;
      // Lỗi fetch/parse: thử lại với thông báo lỗi, không append assistant giả.
      if (attempt === MAX_ATTEMPTS) {
        throw new DraftValidationError("AI trả về dữ liệu không hợp lệ, thử lại sau");
      }
      messages.push({ role: "user", content: `Lỗi hệ thống, thử lại: ${String(err)}` });
      continue;
    }
    try {
      return validateDraftDoc(parsed, text);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        throw new DraftValidationError("AI trả về dữ liệu không hợp lệ, thử lại sau");
      }
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `JSON trên không hợp lệ: ${err instanceof Error ? err.message : String(err)}. Hãy trả lại đúng một object JSON theo schema, không thêm gì khác.`,
      });
    }
  }
  throw new DraftValidationError("AI trả về dữ liệu không hợp lệ, thử lại sau");
}
