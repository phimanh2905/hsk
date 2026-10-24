/* Validate module thuần cho dialogue (W3) — không import node:fs.
   Shape record: { id: "<book>/<lesson>", book, lesson, title, titleVi,
   lines: [{n, speaker: "A"|"B", zh, pinyin, vi, audio?, durSec?}] }.
   Quy tắc: 8–15 câu/bài, 2 vai A/B xen kẽ (bắt đầu A), mỗi câu đủ zh/pinyin/vi,
   id khớp book/lesson. OOV vocab chỉ là warning (oov != rỗng, ok vẫn true). */

export type DialogueLine = {
  n: number;
  speaker: "A" | "B";
  zh: string;
  pinyin: string;
  vi: string;
  audio?: string;
  durSec?: number;
};

export type DialogueRecord = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  lines: DialogueLine[];
};

export const MIN_LINES = 8;
export const MAX_LINES = 15;

export function dialogueId(book: string, lesson: string): string {
  return `${book}/${lesson}`;
}

/* Hanzi Unicode range; punctuation tiếng Trung hợp lệ trong câu dialogue. */
const HANZI_RE = /[\u4e00-\u9fff]/g;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function validateDialogue(
  raw: unknown,
  vocabSet: Set<string>
): { ok: boolean; errors: string[]; oov: string[] } {
  const errors: string[] = [];
  const oov: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["raw không phải object dialogue"], oov };
  }
  const rec = raw as Record<string, unknown>;

  for (const field of ["id", "book", "lesson", "title", "titleVi"] as const) {
    if (!isNonEmptyString(rec[field])) errors.push(`field "${field}" phải là chuỗi khác rỗng`);
  }
  if (isNonEmptyString(rec.book) && isNonEmptyString(rec.lesson) && isNonEmptyString(rec.id)) {
    if (rec.id !== dialogueId(rec.book, rec.lesson)) {
      errors.push(`id "${rec.id}" không khớp "${dialogueId(rec.book, rec.lesson)}"`);
    }
  }

  const lines = rec.lines;
  if (!Array.isArray(lines)) {
    errors.push('field "lines" phải là mảng');
    return { ok: false, errors, oov };
  }
  if (lines.length < MIN_LINES) {
    errors.push(`ít hơn 8 câu: ${lines.length} dòng`);
  } else if (lines.length > MAX_LINES) {
    errors.push(`nhiều hơn 15 câu: ${lines.length} dòng`);
  }

  const seenOov = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i] as Record<string, unknown> | null;
    if (typeof ln !== "object" || ln === null) {
      errors.push(`dòng ${i + 1}: không phải object`);
      continue;
    }
    const label = `dòng ${i + 1}`;
    if (!Number.isInteger(ln.n) || (ln.n as number) !== i + 1)
      errors.push(`${label}: "n" phải là số nguyên đánh số liên tiếp từ 1 (nhận "${String(ln.n)}")`);
    const sp = ln.speaker;
    if (sp !== "A" && sp !== "B") {
      errors.push(`${label}: speaker phải là "A"/"B", nhận "${String(sp)}"`);
    } else if (i > 0 && (lines[i - 1] as Record<string, unknown> | null)?.speaker === sp) {
      errors.push(`${label}: vai không xen kẽ — 2 dòng liên tiếp cùng speaker "${sp}"`);
    }
    for (const field of ["zh", "pinyin", "vi"] as const) {
      if (!isNonEmptyString(ln[field])) errors.push(`${label}: thiếu "${field}"`);
    }
    // OOV: tách từng hanzi, bỏ dấu câu/space; warning, không ảnh hưởng ok
    if (isNonEmptyString(ln.zh)) {
      for (const ch of (ln.zh as string).match(HANZI_RE) ?? []) {
        if (!vocabSet.has(ch) && !seenOov.has(ch)) {
          seenOov.add(ch);
          oov.push(ch);
        }
      }
    }
  }
  return { ok: errors.length === 0, errors, oov };
}

/* Upsert theo id: record cùng id bị THAY BỞI bản mới (không giữ bản cũ đầu mảng —
   --retry phải đảm bảo nội dung regenerate thắng). */
export function upsertDialogue(
  records: DialogueRecord[],
  rec: DialogueRecord
): DialogueRecord[] {
  return [...records.filter((d) => d.id !== rec.id), rec];
}
