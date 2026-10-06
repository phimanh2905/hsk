import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVocabLesson } from "@/lib/content/vocab";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";

/* Route /lesson/[book]/[page] — port clone/js/lesson.js:98-107 (renderHeader).
   Header + polish visual (C11/SPEC-14) render trong LessonClient.
   Content đọc D1 qua content layer → page luôn dynamic (không query lúc build). */
export async function generateMetadata({ params }: { params: Promise<{ book: string; page: string }> }): Promise<Metadata> {
  const { book, page } = await params;
  const lesson = await getVocabLesson(book, page);
  if (!lesson) return {};
  return {
    title: lesson.title,
    description: `Bài "${lesson.title}" — ${lesson.words.length} từ vựng kèm pinyin, han Việt và ví dụ.`,
  };
}

export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  const lesson = await getVocabLesson(book, page);
  if (!lesson) notFound();
  const items: LessonItem[] = lesson.words.map((w, i) => ({ ...w, index: i, itemKey: `${book}.${page}.${i}` }));
  return <LessonClient items={items} book={book} page={page} title={lesson.title} />;
}
