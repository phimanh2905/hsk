/* /course (B2) — kệ sách: heading "Bài khoá — Kệ sách" + grid 7 card.
   Port từ clone/js/course.js renderShelf + SPEC-01 §2. */

import Link from "next/link";
import { books } from "@/content/courses";

export default function CourseShelfPage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Bài khoá — Kệ sách</h1>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {books.map((b) => (
          <Link
            key={b.slug}
            href={`/course/${b.slug}`}
            className="card shadow-neo p-5 block hover:-translate-y-1 transition-transform"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-lg font-extrabold">{b.name}</h2>
              <span className="text-xl" aria-hidden="true">📕</span>
            </div>
            <p className="text-sm font-semibold text-nhai-main mb-1">{b.cardMeta}</p>
            <p className="text-xs text-nhai-muted">{b.lessons} bài</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
