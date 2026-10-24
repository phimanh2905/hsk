/* AUTO-GENERATED bởi scripts/content/gen-reading-src.mts (W3 T9) — KHÔNG sửa tay.
   Nguồn: scripts/content/data/reading/passages-hskN.json (gen-reading, validate W3 T8).
   HIỆN TRẠNG: chưa chạy gen-reading trên data thật nên danh sách rỗng — reading-client fallback về demo doc.
   Chạy lại generator sẽ thay thế toàn bộ file này. */

export type ReadingSentence = { zh: string; py: string; vi: string };
export type ReadingVocab = { word: string; py: string; vi: string };
export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };

export type ReadingPassage = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  sentences: ReadingSentence[];
  vocab: ReadingVocab[];
  questions: ReadingQuestion[];
};

export const readingPassages: ReadingPassage[] = [];
