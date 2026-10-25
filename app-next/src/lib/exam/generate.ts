/* Generator đề demo HSK (W6.3) — pure function từ vocab content layer.
   Đề HSK1: listening (choice pinyin), reading (han→vi + cloze example.zh),
   writing (2 câu tự luận). Không randomness — distractors chọn deterministic
   (xoay vòng danh sách từ) để đề ổn định giữa các lần render.
   KHÔNG set audio: Wave 3 Kokoro render offline sẽ điền audioUrl sau. */
import type { VocabWord } from "@/content/vocab";
import type { Exam, ExamQuestion, ExamSection } from "./types";

const BLANK = "__";

/* distractors deterministic: các từ kế tiếp trong danh sách (xoay vòng), khác từ gốc. */
function optionSet(words: VocabWord[], idx: number, count: number): VocabWord[] {
  const n = words.length;
  const out: VocabWord[] = [];
  for (let k = 1; out.length < count - 1 && k < n; k++) {
    const w = words[(idx + k) % n];
    if (w !== words[idx]) out.push(w);
  }
  return out;
}

/* Xáo thứ tự options deterministic: xoay phải `shift` bước để đáp án không luôn đứng đầu. */
function rotate(arr: string[], shift: number): string[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i - (shift % n) + n) % n]);
}

function choiceOptions(
  words: VocabWord[],
  idx: number,
  value: (w: VocabWord) => string
): { options: string[]; answer: string } {
  const answer = value(words[idx]);
  const distractors = optionSet(words, idx, 4).map(value);
  return { options: rotate([answer, ...distractors], idx), answer };
}

function choiceQ(
  words: VocabWord[],
  idx: number,
  value: (w: VocabWord) => string,
  cue: string,
  prompt: (w: VocabWord) => string
): ExamQuestion {
  const { options, answer } = choiceOptions(words, idx, value);
  return { kind: "choice", cue, prompt: prompt(words[idx]), options, answer };
}

/* Cloze: thay lần xuất hiện đầu tiên của hanzi trong example.zh bằng __. */
function clozeQ(words: VocabWord[], idx: number): ExamQuestion | null {
  const w = words[idx];
  const pos = w.example.zh.indexOf(w.hanzi);
  if (pos < 0 || w.hanzi.length === 0) return null;
  const sentenceWithBlank =
    w.example.zh.slice(0, pos) + BLANK + w.example.zh.slice(pos + w.hanzi.length);
  const { options, answer } = choiceOptions(words, idx, (x) => x.hanzi);
  return { kind: "cloze", sentenceWithBlank, options, answer };
}

function listenSection(words: VocabWord[]): ExamSection {
  const n = Math.min(5, words.length);
  const questions: ExamQuestion[] = [];
  for (let i = 0; i < n; i++) {
    questions.push(
      choiceQ(
        words,
        i,
        (w) => w.pinyin,
        "listening",
        (w) => `Nghe từ: ${w.hanzi} — chọn pinyin đúng`
      )
    );
  }
  return { kind: "listening", title: "Phần nghe — chọn pinyin đúng", questions };
}

function readSection(words: VocabWord[]): ExamSection {
  const questions: ExamQuestion[] = [];
  const nChoice = Math.min(3, words.length);
  for (let i = 0; i < nChoice; i++) {
    questions.push(
      choiceQ(
        words,
        i,
        (w) => w.meaning,
        "reading",
        (w) => `Chữ Hán sau nghĩa là gì? ${w.hanzi}`
      )
    );
  }
  let added = 0;
  for (let i = 0; added < 2 && i < words.length; i++) {
    const q = clozeQ(words, (nChoice + i) % words.length);
    if (q) {
      questions.push(q);
      added++;
    }
  }
  return { kind: "reading", title: "Phần đọc — nghĩa của từ và điền từ", questions };
}

function writeSection(words: VocabWord[]): ExamSection {
  const questions: ExamQuestion[] = [];
  for (let i = 0; i < Math.min(2, words.length); i++) {
    const w = words[i];
    questions.push({
      kind: "free",
      prompt: `Viết lại câu sau bằng chữ Hán: ${w.example.vi}`,
      sampleAnswer: w.example.zh,
    });
  }
  return { kind: "writing", title: "Phần viết — viết câu bằng chữ Hán", questions };
}

export function generateExam(words: VocabWord[], level: string): Exam {
  return {
    level,
    title: `Đề thi demo ${level}`,
    sections: [listenSection(words), readSection(words), writeSection(words)],
  };
}
