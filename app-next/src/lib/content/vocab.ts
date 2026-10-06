/* Content layer — vocab (spec dehardcode §4.1, §4.2). Pages/components gọi qua
   đây, KHÔNG import trực tiếp src/content/vocab; nguồn dữ liệu là D1
   (bảng content_vocabs, seed bởi scripts/seed/gen-vocab-seed.mts).
   Chỉ chạy server-side — createDb() cần binding D1 trong request context. */
import { and, asc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { contentVocabs } from "@/lib/db/schema";
import type { VocabLesson, VocabWord } from "@/content/vocab";

export type { VocabLesson, VocabWord };
export type VocabData = Record<string, Record<string, VocabLesson>>;

export type VocabLessonMeta = { pageId: string; title: string; wordCount: number; firstHanzi: string };
export type VocabBookMeta = { book: string; lessons: VocabLessonMeta[] };
export type VocabMeta = VocabBookMeta[];

export class ContentNotFoundError extends Error {
  constructor(dataset: string) {
    super(`Content dataset rỗng hoặc chưa seed: ${dataset}`);
    this.name = "ContentNotFoundError";
  }
}

type VocabRow = {
  book: string;
  pageId: string;
  ord: number;
  title: string;
  words: VocabWord[];
};

/* Pure function (test được): flatten rows → nested Record, sort theo ord. */
export function rowsToVocabData(rows: VocabRow[]): VocabData {
  const out: VocabData = {};
  for (const r of [...rows].sort((a, b) => a.ord - b.ord)) {
    (out[r.book] ??= {})[r.pageId] = { title: r.title, words: r.words };
  }
  return out;
}

export function rowsToVocabMeta(rows: VocabRow[]): VocabMeta {
  const data = rowsToVocabData(rows);
  return Object.entries(data).map(([book, pages]) => ({
    book,
    lessons: Object.entries(pages).map(([pageId, lesson]) => ({
      pageId,
      title: lesson.title,
      wordCount: lesson.words.length,
      firstHanzi: lesson.words[0]?.hanzi ?? "",
    })),
  }));
}

export async function getVocab(): Promise<VocabData> {
  const rows = await createDb().select().from(contentVocabs).orderBy(asc(contentVocabs.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_vocabs");
  return rowsToVocabData(rows);
}

export async function getVocabLesson(book: string, pageId: string): Promise<VocabLesson | null> {
  const rows = await createDb()
    .select()
    .from(contentVocabs)
    .where(and(eq(contentVocabs.book, book), eq(contentVocabs.pageId, pageId)));
  return rows[0] ? { title: rows[0].title, words: rows[0].words } : null;
}

export async function getVocabMeta(): Promise<VocabMeta> {
  const rows = await createDb().select().from(contentVocabs).orderBy(asc(contentVocabs.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_vocabs");
  return rowsToVocabMeta(rows);
}
