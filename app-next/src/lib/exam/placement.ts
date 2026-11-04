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

/* Distractor deterministic: các từ kế tiếp trong danh sách, khác từ gốc (như exam/generate.ts optionSet). */
function distractors(words: VocabWord[], idx: number, value: (w: VocabWord) => string): string[] {
  const n = words.length;
  const out: string[] = [];
  for (let k = 1; out.length < 3 && k < n; k++) {
    const v = value(words[(idx + k) % n]);
    if (v !== value(words[idx]) && !out.includes(v)) out.push(v);
  }
  return out;
}

/* Xáo options: xoay phải `shift` bước — đáp án không luôn đứng đầu. */
function rotate(arr: string[], shift: number): string[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i - (shift % n) + n) % n]);
}

function meaningQ(words: VocabWord[], idx: number): PlacementQuestion {
  const w = words[idx];
  const options = rotate([w.meaning, ...distractors(words, idx, (x) => x.meaning)], idx);
  return { kind: "meaning", prompt: `Từ ${w.hanzi} (${w.pinyin}) nghĩa là gì?`, options, answer: w.meaning };
}

function clozeQ(words: VocabWord[], idx: number): PlacementQuestion | null {
  const w = words[idx];
  const pos = w.example.zh.indexOf(w.hanzi);
  if (pos < 0 || w.hanzi.length === 0) return null;
  const options = rotate([w.hanzi, ...distractors(words, idx, (x) => x.hanzi)], idx);
  return {
    kind: "cloze",
    prompt: w.example.zh.slice(0, pos) + "__" + w.example.zh.slice(pos + w.hanzi.length),
    options,
    answer: w.hanzi,
  };
}

function flatten(data: VocabData, level: PlacementStage): VocabWord[] {
  const lessons: Record<string, VocabLesson> = data[level] ?? {};
  return Object.values(lessons).flatMap((l) => l.words);
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
