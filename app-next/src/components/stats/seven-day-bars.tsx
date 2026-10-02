"use client";
/* Port renderWeek từ clone/js/review-stats.js:161-180 — bar chart 7 ngày gần nhất.
   Cột fill jade (--action-primary), số lượt nằm ngay trên mỗi cột (visual luôn đi kèm số). */
import { Card } from "@/components/ui/card";

const DAY_LABELS = ["T3", "T4", "T5", "T6", "T7", "CN", "T2"];

export function SevenDayBars({ last7 }: { last7: number[] }) {
  const max = Math.max(...last7, 1);
  return (
    <Card className="mb-6">
      <h3 className="font-extrabold tracking-tight mb-4">7 ngày gần nhất</h3>
      <div className="flex items-end justify-between gap-2 h-44">
        {last7.map((v, i) => {
          const isToday = i === last7.length - 1; /* cột cuối = hôm nay (T2) */
          const h = Math.round((v / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div data-bar-count className="text-[11px] font-bold tabular-nums text-text-primary">{v}</div>
              <div
                data-bar
                className="w-full max-w-[36px] rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: "var(--action-primary)",
                  opacity: isToday ? 1 : 0.4,
                }}
              />
              <div className="text-[11px] font-semibold text-text-secondary">{DAY_LABELS[i]}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
