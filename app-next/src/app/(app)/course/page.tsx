/* /course (B2) — kệ sách: heading "Bài khoá — Kệ sách" + grid 7 card.
   Port từ clone/js/course.js renderShelf + SPEC-01 §2. */

import Link from "next/link";
import { books } from "@/content/courses";
import { Card } from "@/components/ui/card";
import { BookOpen, ICON_STROKE } from "@/components/ui/icon";

export const metadata = { title: "Bài khoá", description: "Kệ sách 7 khoá HSK 3.0 — từ HSK 1 đến HSK 7-9, mỗi khoá học theo bài với flashcard, trắc nghiệm và tổng ôn." };

export default function CourseShelfPage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Bài khoá — Kệ sách</h1>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {books.map((b) => (
          <Link key={b.slug} href={`/course/${b.slug}`} className="block hover:-translate-y-1 transition-transform">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-lg font-extrabold">{b.name}</h2>
                <BookOpen size={20} strokeWidth={ICON_STROKE} className="text-action-primary shrink-0" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-action-primary mb-1">{b.cardMeta}</p>
              <p className="text-xs text-text-secondary">{b.lessons} bài</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
