import { notFound } from "next/navigation";
import { vocab } from "@/content/vocab";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";

/* Route /lesson/[book]/[page] — port clone/js/lesson.js:98-107 (renderHeader).
   Header + polish visual (C11/SPEC-14) render trong LessonClient. */
export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  const lesson = vocab[book]?.[page];
  if (!lesson) notFound();
  const items: LessonItem[] = lesson.words.map((w, i) => ({ ...w, index: i, itemKey: `${book}.${page}.${i}` }));
  return <LessonClient items={items} book={book} page={page} title={lesson.title} />;
}
