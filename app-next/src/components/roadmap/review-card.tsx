"use client";

/* Card "Tổng ôn" dưới serpentine (spec 2026-10-28 §6.3): link /review +
   badge số thẻ SRS đến hạn (mount-gated, re-sync qua bye:progress). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat } from "@/components/ui/icon";
import { progressStore } from "@/lib/store/progress-store";

export function ReviewCard() {
  const [due, setDue] = useState(0);
  useEffect(() => {
    const sync = () => {
      try {
        const now = Date.now();
        setDue(
          progressStore
            .getAllSrs()
            .filter((it) => it.status !== "new" && it.dueAt != null && it.dueAt <= now).length,
        );
      } catch {
        setDue(0);
      }
    };
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);

  return (
    <Link
      href="/review"
      className="flex min-h-16 items-center gap-4 rounded-card border border-border-default bg-surface-elevated px-4 py-3.5 shadow-xs transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Ôn tập ngắt quãng — ${due} thẻ đến hạn`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border-default bg-surface-muted">
        <Repeat size={18} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-sm">Tổng ôn</b>
          {due > 0 && (
            <span
              data-testid="review-due"
              className="rounded-full border border-border-default bg-amber-wash px-2 py-0.5 text-[11px] font-extrabold text-amber-ink dark:text-learning-streak"
            >
              {due} thẻ đến hạn
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-text-secondary">
          Ôn tập ngắt quãng (SRS) từ vựng &amp; ngữ pháp đã học — thêm thẻ bằng nút ⭐ trong bài học, đến hạn là vào ôn.
        </span>
      </span>
      <span className="text-sm font-bold text-action-primary">Vào ôn →</span>
    </Link>
  );
}
