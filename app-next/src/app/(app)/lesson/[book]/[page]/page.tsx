import { notFound } from "next/navigation";
import { vocab } from "@/content/vocab";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";

/* Route /lesson/[book]/[page] — port clone/js/lesson.js:98-107 (renderHeader). */
export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  const lesson = vocab[book]?.[page];
  if (!lesson) notFound();
  const items: LessonItem[] = lesson.words.map((w, i) => ({ ...w, index: i, itemKey: `${book}.${page}.${i}` }));
  const num = /^lesson-(\d+)$/.exec(page)?.[1] ?? "1";
  return (
    <div className="space-y-4">
      {/* header (visual chi tiết ở Task 19 — C11; ở đây cấu trúc đúng trước) */}
      <div>
        <a
          href={`/course/${book}?skill=vocab`}
          className="text-sm font-bold text-[var(--nhai-muted)] hover:underline"
        >
          ← Danh sách bài
        </a>
        <div className="flex items-center gap-2 mt-2">
          <span className="pill bg-[#1f1e1d] text-white text-xs">Bài {num}</span>
          <span className="pill text-xs">{lesson.words.length} từ vựng</span>
        </div>
        <h1 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
          {lesson.title} <span aria-hidden>🍅</span>
        </h1>
      </div>
      <LessonClient items={items} book={book} page={page} />
    </div>
  );
}
