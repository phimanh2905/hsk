"use client";

/* MemBar 5 đoạn — port .mem/.segs của mock: master=5 jade, study=3 amber, new=1 rose. */
import type { VocabStatus } from "@/lib/my-vocab";
import { cn } from "@/lib/cn";

const LEVEL: Record<VocabStatus, number> = { master: 5, study: 3, new: 1 };

export function MemSegs({ status }: { status: VocabStatus }) {
  const lv = LEVEL[status];
  const on = lv >= 4 ? "bg-learning-mastered" : lv >= 2 ? "bg-learning-progress" : "bg-action-primary";
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={cn("h-1.5 w-4 rounded-full", i <= lv ? on : "bg-border-subtle")} />
        ))}
      </span>
      <b className="min-w-[30px] text-right text-[11.5px] tabular-nums text-text-primary">{lv}/5</b>
    </span>
  );
}
