/* Content layer — readings (spec 2026-10-30 reading-library). Nguồn D1 content_readings.
   Type dùng chung client/server; getReadings() chỉ chạy server (D1 binding). */
export type ReadingDocSentence = { zh: string; py: string; vi: string; audio: string | null; durSec: number };
export type ReadingVocabRow = { word: string; py: string; vi: string };
export type ReadingEvidence = { si: number; s: number; e: number };
export type ReadingQuestionRow = { q: string; qVi: string; options: string[]; answer: number; evidence?: ReadingEvidence[] };
export type ReadingDoc = {
  id: string; level: string; ord: number;
  title: string; titleVi: string;
  sentences: ReadingDocSentence[];
  vocab: ReadingVocabRow[];
  questions: ReadingQuestionRow[];
  audioDir: string; chars: number; durationSec: number;
};

export async function getReadings(): Promise<ReadingDoc[]> {
  const { createDb } = await import("@/lib/db");
  const { contentReadings } = await import("@/lib/db/schema");
  const { asc } = await import("drizzle-orm");
  const db = createDb();
  const rows = await db.select().from(contentReadings).orderBy(asc(contentReadings.level), asc(contentReadings.ord));
  return rows.map((r) => ({
    id: r.id, level: r.level, ord: r.ord, title: r.title, titleVi: r.titleVi,
    sentences: r.sentences as ReadingDocSentence[],
    vocab: r.vocab as ReadingVocabRow[],
    questions: r.questions as ReadingQuestionRow[],
    audioDir: r.audioDir, chars: r.chars, durationSec: r.durationSec,
  }));
}
