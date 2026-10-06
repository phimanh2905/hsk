/* Content layer — vocab (spec dehardcode §4.1). Pages/components gọi qua đây,
   KHÔNG import trực tiếp src/content/vocab; nguồn dữ liệu (static → D1)
   là chi tiết nội bộ, chữ ký bất đồng bộ giữ nguyên. */
import { vocab as staticVocab } from "@/content/vocab";
import type { VocabLesson, VocabWord } from "@/content/vocab";

export type { VocabLesson, VocabWord };
export type VocabData = Record<string, Record<string, VocabLesson>>;

export type VocabLessonMeta = { pageId: string; title: string; wordCount: number; firstHanzi: string };
export type VocabBookMeta = { book: string; lessons: VocabLessonMeta[] };
export type VocabMeta = VocabBookMeta[];

export async function getVocab(): Promise<VocabData> {
  return staticVocab;
}

export async function getVocabLesson(book: string, pageId: string): Promise<VocabLesson | null> {
  return staticVocab[book]?.[pageId] ?? null;
}

export async function getVocabMeta(): Promise<VocabMeta> {
  return Object.entries(staticVocab).map(([book, pages]) => ({
    book,
    lessons: Object.entries(pages).map(([pageId, lesson]) => ({
      pageId,
      title: lesson.title,
      wordCount: lesson.words.length,
      firstHanzi: lesson.words[0]?.hanzi ?? "",
    })),
  }));
}
