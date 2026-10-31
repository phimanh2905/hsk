"use client";

/* LessonRemote — SSG gate cho /lesson/[book]/[page]: fetch bài học qua
   /api/v1/content/vocab-lesson on-mount (page tĩnh, không đọc D1 lúc build).
   Render LessonClient khi data về; skeleton trong lúc loading. */
import { useEffect, useState } from "react";
import Link from "next/link";
import LessonClient from "./lesson-client";
import type { LessonItem } from "./lesson-provider";
import type { VocabWord } from "@/content/vocab";
import { Card } from "@/components/ui/card";

export default function LessonRemote({ book, page }: { book: string; page: string }) {
  const [loaded, setLoaded] = useState<{ items: LessonItem[]; title: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/content/vocab-lesson?book=${encodeURIComponent(book)}&page=${encodeURIComponent(page)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ lesson: { title: string; words: VocabWord[] } }>;
      })
      .then((d) => {
        if (cancelled) return;
        setLoaded({
          items: d.lesson.words.map((w, i) => ({
            ...w,
            index: i,
            itemKey: `${book}.${page}.${i}`,
          })),
          title: d.lesson.title,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [book, page]);

  if (error) {
    return (
      <Card className="max-w-[760px] mx-auto mt-8 p-8 text-center">
        <p>Bài học không tồn tại hoặc lỗi tải dữ liệu.</p>
        <Link
          href="/roadmap"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-transparent bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover mt-4"
        >
          Về lộ trình học
        </Link>
      </Card>
    );
  }
  if (!loaded) {
    return (
      <div aria-busy="true" className="mx-auto max-w-[880px] flex flex-col gap-4 pt-4">
        <div className="h-12 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-72 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-card bg-surface-muted" />
      </div>
    );
  }
  return <LessonClient items={loaded.items} book={book} page={page} title={loaded.title} />;
}
