/* Placement test (spec 2026-11-04 §4) — ladder 5 block × 3 câu trắc nghiệm đọc.
   Pure + deterministic theo seed (distractor xoay vòng như exam/generate.ts).
   KHÔNG nghe (chưa có audio per-vocab), KHÔNG tự luận. */
import type { VocabData, VocabLesson } from "@/lib/content/vocab";
import type { VocabWord } from "@/content/vocab";
import type { StageId } from "@/lib/store/progress-store";

export type PlacementStage = "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
export const PLACEMENT_LEVELS: PlacementStage[] = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"];
export const PLACEMENT_PASS = 2;

export type PlacementQuestion = { kind: "meaning" | "cloze"; prompt: string; options: string[]; answer: string };
export type PlacementBlock = { level: PlacementStage; questions: PlacementQuestion[] };

/* Entry kèm lesson để ưu tiên distractor cùng bài (spec §9: cùng lesson trước, thiếu mới lấy khác lesson). */
type LessonEntry = { w: VocabWord; lesson: string };

/* Distractor deterministic: ưu tiên các từ cùng lesson (theo thứ tự ổn định), thiếu thì duyệt toàn cục;
   bỏ qua chính từ gốc, value trùng đáp án hoặc trùng nhau (như exam/generate.ts optionSet). */
function distractors(entries: LessonEntry[], idx: number, value: (w: VocabWord) => string): string[] {
  const target = entries[idx];
  const own = value(target.w);
  const out: string[] = [];
  const pick = (pool: LessonEntry[]) => {
    for (let k = 0; out.length < 3 && k < pool.length; k++) {
      const e = pool[k];
      if (e === target) continue;
      const v = value(e.w);
      if (v === own || out.includes(v)) continue;
      out.push(v);
    }
  };
  pick(entries.filter((e) => e.lesson === target.lesson));
  pick(entries);
  return out;
}

/* Xáo options: xoay phải `shift` bước — đáp án không luôn đứng đầu. */
function rotate(arr: string[], shift: number): string[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i - (shift % n) + n) % n]);
}

function meaningQ(entries: LessonEntry[], idx: number): PlacementQuestion {
  const w = entries[idx].w;
  const options = rotate([w.meaning, ...distractors(entries, idx, (x) => x.meaning)], idx);
  return { kind: "meaning", prompt: `Từ ${w.hanzi} (${w.pinyin}) nghĩa là gì?`, options, answer: w.meaning };
}

function clozeQ(entries: LessonEntry[], idx: number): PlacementQuestion | null {
  const w = entries[idx].w;
  const pos = w.example.zh.indexOf(w.hanzi);
  if (pos < 0 || w.hanzi.length === 0) return null;
  const options = rotate([w.hanzi, ...distractors(entries, idx, (x) => x.hanzi)], idx);
  return {
    kind: "cloze",
    prompt: w.example.zh.slice(0, pos) + "__" + w.example.zh.slice(pos + w.hanzi.length),
    options,
    answer: w.hanzi,
  };
}

function flatten(data: VocabData, level: PlacementStage): LessonEntry[] {
  const lessons: Record<string, VocabLesson> = data[level] ?? {};
  return Object.entries(lessons).flatMap(([lesson, l]) => l.words.map((w) => ({ w, lesson })));
}

export function generatePlacementBlocks(data: VocabData, seed: number): PlacementBlock[] {
  return PLACEMENT_LEVELS.map((level, li) => {
    const words = flatten(data, level);
    if (words.length < 4) throw new Error(`placement: thiếu từ cho ${level}`);
    const offset = (seed + li * 3) % words.length;
    const questions: PlacementQuestion[] = [
      meaningQ(words, offset % words.length),
      meaningQ(words, (offset + 2) % words.length),
    ];
    const cloze = clozeQ(words, (offset + 4) % words.length) ?? meaningQ(words, (offset + 4) % words.length);
    questions.push(cloze);
    return { level, questions };
  });
}

/** Ladder: pass (≥ PLACEMENT_PASS) thì lên block kế; block đầu fail → stage trước, hsk1 fail → "pinyin". */
export function placementSuggestedStage(
  blocks: Partial<Record<PlacementStage, { correct: number; total: number }>>,
): StageId {
  let last: StageId = "pinyin";
  for (const level of PLACEMENT_LEVELS) {
    const b = blocks[level];
    if (!b || b.correct < PLACEMENT_PASS) break;
    last = level;
  }
  return last;
}
