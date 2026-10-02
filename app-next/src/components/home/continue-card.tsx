"use client";

/* ContinueCard (B1) — card "Học tiếp" trên trang chủ.
   Port từ clone/js/home.js + SPEC-01: đọc progressStore.listPageDone(), tìm bài vocab
   CHƯA done kế tiếp cùng book (bỏ qua book đã xong hết); không có bài dở → null.
   SSG-safe: chỉ đọc localStorage sau mount. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { courses } from "@/content/courses";
import { vocab } from "@/content/vocab";
import { progressStore } from "@/lib/store/progress-store";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "@/components/ui/icon";

export default function ContinueCard(): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [next, setNext] = useState<{ book: string; pageId: string; title: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const done = progressStore.listPageDone();
    if (done.length === 0) return;

    /* Group key `book/page` theo book, giữ thứ tự sort (alphabet) của listPageDone. */
    const byBook = new Map<string, Set<string>>();
    for (const k of done) {
      const idx = k.indexOf("/");
      if (idx <= 0) continue;
      const book = k.slice(0, idx);
      if (!courses[book]) continue;
      if (!byBook.has(book)) byBook.set(book, new Set());
      byBook.get(book)!.add(k.slice(idx + 1));
    }

    for (const [book, donePages] of byBook) {
      const pages = courses[book].pages;
      const nextLesson = pages.find((p) => p.skill === "vocab" && !donePages.has(p.pageId));
      /* book đã xong hết (hoặc không còn bài vocab) → bỏ qua book đó. */
      if (!nextLesson) continue;
      const title = vocab[book]?.[nextLesson.pageId]?.title ?? nextLesson.title;
      setNext({ book, pageId: nextLesson.pageId, title });
      return;
    }
    setNext(null);
  }, []);

  if (!mounted || !next) return null;

  return (
    <Card className="p-4 sm:p-6">
      {/* CTA chính duy nhất của trang chủ — Link primary (cùng style Button primary) */}
      <Link
        href={`/lesson/${next.book}/${next.pageId}`}
        className="inline-flex items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-5 font-semibold min-h-11 text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      >
        Học tiếp: {next.title} · Bài {parseInt(next.pageId.replace("lesson-", ""), 10)}
        <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </Card>
  );
}
