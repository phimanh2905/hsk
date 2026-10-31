import type { Metadata } from "next";
import LessonRemote from "@/components/lesson/lesson-remote";
import { vocab } from "@/content/vocab";

/* Route /lesson/[book]/[page] — port clone/js/lesson.js:98-107 (renderHeader).
   SSG: generateStaticParams từ dataset seed (src/content/vocab.ts, build-time
   import — nguồn truth của content_vocabs); data render client-fetch qua
   /api/v1/content/vocab-lesson trong LessonRemote. */
export const dynamicParams = false;

export function generateStaticParams(): { book: string; page: string }[] {
  const out: { book: string; page: string }[] = [];
  for (const [book, pages] of Object.entries(vocab)) {
    for (const page of Object.keys(pages)) {
      out.push({ book, page });
    }
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ book: string; page: string }> }): Promise<Metadata> {
  const { book, page } = await params;
  const lesson = vocab[book]?.[page];
  if (!lesson) return {};
  return {
    title: lesson.title,
    description: `Bài "${lesson.title}" — ${lesson.words.length} từ vựng kèm pinyin, han Việt và ví dụ.`,
  };
}

export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  return <LessonRemote key={`${book}/${page}`} book={book} page={page} />;
}
