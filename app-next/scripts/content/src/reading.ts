/* Validate module thuần cho reading passage (W3 T8) — không import node:fs.
   Shape record: { id: "<book>-reading-<stt>", book, lesson, title, titleVi,
   sentences: [{zh, py, vi}], vocab: [{word, py, vi}] (5–8 từ),
   questions: [{q, qVi, options: 3 mục, answer: 0–2}] (3–5 câu) }.
   Quy tắc: 12–20 câu/bài; title/titleVi khác rỗng; id khớp book + stt.
   OOV vocab chỉ là warning (reading cho phép từ đã học ở level trước — oov != rỗng,
   ok vẫn true). Field name zh/py/vi + word/py/vi khớp demoDoc trong src/content/reading
   để reading-client tái dùng engine karaoke + Extras không phải convert. */

export type ReadingSentence = { zh: string; py: string; vi: string };
export type ReadingVocab = { word: string; py: string; vi: string };
export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };

export type ReadingPassageRecord = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  sentences: ReadingSentence[];
  vocab: ReadingVocab[];
  questions: ReadingQuestion[];
};

export const MIN_SENTENCES = 12;
export const MAX_SENTENCES = 20;
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 5;
export const MIN_VOCAB = 5;
export const MAX_VOCAB = 8;
export const OPTION_COUNT = 3;

export function readingId(book: string, stt: number): string {
  return `${book}-reading-${stt}`;
}

/* Hanzi Unicode range; dấu câu/space latin hoặc tiếng Trung đều bỏ qua khi check OOV. */
const HANZI_RE = /[\u4e00-\u9fff]/g;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function collectOov(text: string, vocabSet: Set<string>, seen: Set<string>, oov: string[]): void {
  for (const ch of text.match(HANZI_RE) ?? []) {
    if (!vocabSet.has(ch) && !seen.has(ch)) {
      seen.add(ch);
      oov.push(ch);
    }
  }
}

export function validateReadingPassage(
  raw: unknown,
  vocabSet: Set<string>,
  expectedStt?: number
): { ok: boolean; errors: string[]; oov: string[] } {
  const errors: string[] = [];
  const oov: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["raw không phải object passage"], oov };
  }
  const rec = raw as Record<string, unknown>;

  for (const field of ["id", "book", "lesson", "title", "titleVi"] as const) {
    if (!isNonEmptyString(rec[field])) errors.push(`field "${field}" phải là chuỗi khác rỗng`);
  }
  if (isNonEmptyString(rec.book) && isNonEmptyString(rec.id)) {
    const m = /^-reading-(\d+)$/.exec(rec.id.slice(rec.book.length));
    const stt = m ? parseInt(m[1]!, 10) : NaN;
    if (!m || rec.id !== readingId(rec.book, stt)) {
      errors.push(`id "${rec.id}" không khớp dạng "<book>-reading-<stt>"`);
    } else if (expectedStt !== undefined && stt !== expectedStt) {
      errors.push(`id "${rec.id}" không khớp stt mong đợi ${expectedStt}`);
    }
  }

  const sentences = rec.sentences;
  if (!Array.isArray(sentences)) {
    errors.push('field "sentences" phải là mảng');
    return { ok: false, errors, oov };
  }
  if (sentences.length < MIN_SENTENCES) {
    errors.push(`ít hơn ${MIN_SENTENCES} câu: ${sentences.length} câu`);
  } else if (sentences.length > MAX_SENTENCES) {
    errors.push(`nhiều hơn ${MAX_SENTENCES} câu: ${sentences.length} câu`);
  }

  const seenOov = new Set<string>();
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i] as Record<string, unknown> | null;
    if (typeof s !== "object" || s === null) {
      errors.push(`câu ${i + 1}: không phải object`);
      continue;
    }
    for (const field of ["zh", "py", "vi"] as const) {
      if (!isNonEmptyString(s[field])) errors.push(`câu ${i + 1}: thiếu "${field}"`);
    }
    if (isNonEmptyString(s.zh)) collectOov(s.zh, vocabSet, seenOov, oov);
  }

  const vocab = rec.vocab;
  if (!Array.isArray(vocab)) {
    errors.push('field "vocab" phải là mảng 5–8 từ');
  } else if (vocab.length < MIN_VOCAB || vocab.length > MAX_VOCAB) {
    errors.push(`vocab phải 5–8 từ, nhận ${vocab.length}`);
  } else {
    vocab.forEach((v, i) => {
      const e = v as Record<string, unknown> | null;
      if (typeof e !== "object" || e === null) {
        errors.push(`vocab ${i + 1}: không phải object`);
        return;
      }
      for (const field of ["word", "py", "vi"] as const) {
        if (!isNonEmptyString(e[field])) errors.push(`vocab ${i + 1}: thiếu "${field}"`);
      }
    });
  }

  const questions = rec.questions;
  if (!Array.isArray(questions)) {
    errors.push('field "questions" phải là mảng 3–5 câu hỏi');
  } else if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
    errors.push(`questions phải ${MIN_QUESTIONS}–${MAX_QUESTIONS} câu, nhận ${questions.length}`);
  } else {
    questions.forEach((q, i) => {
      const e = q as Record<string, unknown> | null;
      const label = `question ${i + 1}`;
      if (typeof e !== "object" || e === null) {
        errors.push(`${label}: không phải object`);
        return;
      }
      for (const field of ["q", "qVi"] as const) {
        if (!isNonEmptyString(e[field])) errors.push(`${label}: thiếu "${field}"`);
      }
      if (!Array.isArray(e.options) || e.options.length !== OPTION_COUNT) {
        errors.push(`${label}: options phải đúng ${OPTION_COUNT} mục`);
      } else if (!e.options.every((o) => isNonEmptyString(o))) {
        errors.push(`${label}: options có mục rỗng`);
      }
      if (!Number.isInteger(e.answer) || (e.answer as number) < 0 || (e.answer as number) >= OPTION_COUNT) {
        errors.push(`${label}: answer phải là số nguyên 0–${OPTION_COUNT - 1}, nhận "${String(e.answer)}"`);
      }
      if (isNonEmptyString(e.q)) collectOov(e.q, vocabSet, seenOov, oov);
    });
  }

  return { ok: errors.length === 0, errors, oov };
}

/* Upsert theo id: record cùng id bị THAY BỞI bản mới (--retry regenerate thắng). */
export function upsertPassage(
  records: ReadingPassageRecord[],
  rec: ReadingPassageRecord
): ReadingPassageRecord[] {
  return [...records.filter((p) => p.id !== rec.id), rec];
}
