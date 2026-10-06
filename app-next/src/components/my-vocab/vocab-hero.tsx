"use client";

/* Hero — port .hero của mock: "THE MEMORY COMMAND" + N từ cần làm mới + pills + CTA review. */
import { Button } from "@/components/ui/button";

export function VocabHero({
  dueCount, total, mastery, hskTarget, onReview,
}: {
  dueCount: number;
  total: number;
  mastery: number;
  hskTarget: string | null;
  onReview: () => void;
}) {
  return (
    <section
      data-od-id="memory-hero"
      aria-label="Tổng quan trí nhớ"
      className="grid items-center gap-[18px] rounded-[20px] border border-border-subtle bg-surface-elevated/80 p-6 shadow-xs backdrop-blur-sm max-sm:grid-cols-1 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="text-[11px] font-extrabold tracking-[0.1em] text-text-secondary">THE MEMORY COMMAND</div>
        <h1 className="mt-1.5 mb-1 text-[21px] tracking-[-0.01em] text-text-primary">
          Hôm nay có <span className="text-action-primary">{dueCount} từ</span> cần làm mới
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-border-subtle bg-surface-muted px-3.5 py-1.5 text-[12.5px] font-bold text-text-secondary">
            Tổng: <b className="text-text-primary">{total} từ</b>
          </span>
          <span className="rounded-full border border-border-subtle bg-surface-muted px-3.5 py-1.5 text-[12.5px] font-bold text-text-secondary">
            Đã nhớ vững: <b className="text-learning-mastered">{mastery}%</b>
          </span>
          {hskTarget && (
            <span className="rounded-full border border-border-subtle bg-surface-muted px-3.5 py-1.5 text-[12.5px] font-bold text-text-secondary">
              HSK mục tiêu: <b className="text-text-primary">{hskTarget}</b>
            </span>
          )}
        </div>
      </div>
      <Button
        onClick={onReview}
        className="min-h-[52px] rounded-[14px] px-[30px] text-[14.5px] shadow-cta"
      >
        Luyện tập ngay
      </Button>
    </section>
  );
}
