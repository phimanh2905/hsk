"use client";

/* CourseProgress (B2) — khối "Tiến độ học" trên trang khóa học.
   Port từ clone/js/course.js (renderBook) + SPEC-01 §2: "x/N bài" (N = số bài vocab
   của book) + thanh progress %. SSG-safe: chỉ đọc localStorage sau mount,
   re-read khi progressStore phát sự kiện nhai:progress. */

import { useEffect, useState } from "react";
import { courses } from "@/content/courses";
import { progressStore } from "@/lib/store/progress-store";

const PROGRESS_EVENT = "nhai:progress";

export default function CourseProgress({ book }: { book: string }) {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(0);

  const total = courses[book]?.pages.length ?? 0;

  useEffect(() => {
    const read = () => setDone(progressStore.listPageDone(book).length);
    setMounted(true);
    read();
    window.addEventListener(PROGRESS_EVENT, read);
    return () => window.removeEventListener(PROGRESS_EVENT, read);
  }, [book]);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">Tiến độ học</span>
        <span className="text-sm font-semibold text-nhai-muted">{done}/{total} bài</span>
      </div>
      <div className="h-2 bg-nhai-soft rounded">
        <div className="h-2 bg-nhai-main rounded" style={{ width: `${mounted ? pct : 0}%` }} />
      </div>
    </div>
  );
}
