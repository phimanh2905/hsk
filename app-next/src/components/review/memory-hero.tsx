"use client";

import { Button } from "@/components/ui/button";
import { Play } from "@/components/ui/icon";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <b className="block text-[19px] leading-tight">{value}</b>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

/* Hero tổng quan (mock .hero, spec §3): kicker + h1 số tô vermilion + 3 stat + CTA lg. */
export function MemoryHero({
  count, avgMem, estMinutes, urgent, emptyQueue, onStart,
}: {
  count: number;
  avgMem: number;
  estMinutes: number;
  urgent: number;
  emptyQueue: boolean;
  onStart: () => void;
}) {
  return (
    <section
      aria-label="Tổng quan trí nhớ hôm nay"
      className="grid items-center gap-4 rounded-card border border-border-default bg-surface-elevated p-6 shadow-xs md:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="text-[11px] font-extrabold tracking-[0.1em] text-text-secondary">
          TỔNG QUAN TRÍ NHỚ HÔM NAY
        </div>
        <h1 className="mt-1.5 text-[21px] leading-snug tracking-tight">
          Hôm nay có{" "}
          <span data-testid="hero-count" className="font-extrabold text-action-primary">
            {count} từ
          </span>{" "}
          cần kích hoạt lại trí nhớ
        </h1>
        <div className="mt-2.5 flex flex-wrap gap-4">
          <Stat value={`${avgMem}%`} label="Tỉ lệ ghi nhớ TB" />
          <Stat value={`~${estMinutes} phút`} label="Ước tính hoàn thành" />
          <Stat value={`${urgent} từ`} label="Cần ôn gấp" />
        </div>
      </div>
      <Button
        size="lg"
        data-testid="start-session"
        onClick={onStart}
        className="min-h-14 w-full rounded-2xl px-8 shadow-[0_4px_14px_rgba(200,60,50,.28)] md:w-auto"
      >
        <Play size={16} aria-hidden="true" />
        {emptyQueue ? `Ôn thử tất cả (${count} từ)` : `Bắt đầu ôn tập ngay (${count} từ)`}
      </Button>
    </section>
  );
}
