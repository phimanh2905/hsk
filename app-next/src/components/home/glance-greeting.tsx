"use client";

/* Glance header (port .glance của opendesign index.html, spec 2026-10-04):
   chào theo giờ (hanzi) + ngày, streak full pill + goal ring 44px (DAILY_GOAL_XP).
   Client island vì đọc localStorage qua useHomeSummary.
   C1 (review H16 fix 1): greeting + ngày phụ thuộc giờ/ngày ĐỊA PHƯƠNG — bắt buộc
   nằm sau `mounted` gate. Next prerender trang ở server (TZ có thể khác client),
   text node này mà vào HTML ban đầu sẽ hydration mismatch (cùng họ lỗi C2 Task 5). */

import { DonutRing } from "@/components/ui/donut-ring";
import { StreakPill } from "@/components/ui/streak-pill";
import { useHomeSummary, DAILY_GOAL_XP } from "@/lib/home-summary";

function timeGreeting(): string {
  const h = new Date().getHours();
  return h < 11 ? "早上好" : h < 18 ? "下午好" : "晚上好";
}

export default function GlanceGreeting() {
  const s = useHomeSummary();
  const greeting = s.mounted ? timeGreeting() : "";
  const today = s.mounted
    ? new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
    : "";

  return (
    <section aria-label="Tổng quan hôm nay" className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          <span className="zh text-[1.06em]">{greeting}</span>, chào bạn!
        </h1>
        <p className="mt-2 text-[13.5px] capitalize text-text-secondary">{today}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {s.mounted && <StreakPill days={s.streak} variant="full" />}
        <div
          title={`Mục tiêu mỗi ngày ${DAILY_GOAL_XP} XP`}
          className="flex items-center gap-2.5 rounded-control border border-border-default bg-surface-elevated p-2 pr-3.5 shadow-xs"
        >
          <DonutRing
            value={s.mounted ? s.todayXp : 0}
            total={DAILY_GOAL_XP}
            size={44}
            strokeWidth={5}
            color="var(--hz-jade)"
            label={`Hôm nay ${s.todayXp} trên ${DAILY_GOAL_XP} XP`}
          >
            <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
              {s.todayXp}′
            </text>
          </DonutRing>
          <div className="leading-tight">
            <b className="block text-sm">{s.todayXp}/{DAILY_GOAL_XP} XP</b>
            <small className="block text-[11.5px] text-text-secondary">Hôm nay · mục tiêu {DAILY_GOAL_XP} XP</small>
          </div>
        </div>
      </div>
    </section>
  );
}
