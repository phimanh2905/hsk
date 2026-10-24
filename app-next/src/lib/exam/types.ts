/* Exam types (W6.3) — cấu trúc đề thi demo HSK.
   audio (audioUrl/start/end) chỉ ĐỊNH NGHĨA cấu trúc: Wave 3 Kokoro render
   offline sẽ điền sau; generator KHÔNG set audio, UI phải render được khi thiếu. */

export type ExamSectionKind = "listening" | "reading" | "writing";

export type ExamQuestion =
  | {
      kind: "choice";
      cue: string;
      audio?: { audioUrl: string; start: number; end: number };
      prompt: string;
      options: string[];
      answer: string;
    }
  | {
      kind: "cloze";
      audio?: { audioUrl: string; start: number; end: number };
      sentenceWithBlank: string;
      options: string[];
      answer: string;
    }
  | { kind: "free"; prompt: string; sampleAnswer: string };

export type ExamSection = {
  kind: ExamSectionKind;
  title: string;
  questions: ExamQuestion[];
};

export type Exam = { level: string; title: string; sections: ExamSection[] };

export type ExamSectionResult = {
  section: ExamSectionKind;
  score: number;
  maxScore: number;
};
