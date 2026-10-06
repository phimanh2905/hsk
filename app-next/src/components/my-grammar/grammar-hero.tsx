"use client";

/* Hero — port .hero của mock; h1/pill 3 deviation đã chốt (spec §5.1): số liệu thật. */
import { Button } from "@/components/ui/button";

export function GrammarHero({
  total, savedCount, topLevel, topCount, onReview,
}: {
  total: number;
  savedCount: number;
  topLevel: string | null;
  topCount: number;
  onReview: () => void;
}) {
  return (
    <section
      data-od-id="grammar-hero"
      aria-label="Tổng quan sổ tay ngữ pháp"
      className="grid items-center gap-6 rounded-[24px] border border-border-subtle bg-surface-elevated/85 p-6 shadow-md max-[860px]:justify-items-center max-[860px]:grid-cols-1 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="text-xs font-bold tracking-[0.08em] text-jade-ink">
          SỔ TAY CẤU TRÚC NGỮ PHÁP HSK
        </div>
        <h1 className="mt-1 text-[21px] leading-[1.35] text-text-primary">
          Sổ tay có {total} cấu trúc · {savedCount} cấu trúc đã lưu
        </h1>
        <p className="mt-1.5 text-[13.5px] text-text-secondary">
          Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây, đặt câu đúng trong 10 giây.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topLevel && (
            <span className="rounded-full border border-border-subtle bg-surface-muted px-3.5 py-[7px] text-[12.5px] font-bold text-text-primary">
              📘 {topLevel}: {topCount} mẫu
            </span>
          )}
          <span className="rounded-full border border-amber-line bg-amber-wash px-3.5 py-[7px] text-[12.5px] font-bold text-amber-ink">
            ⭐ {savedCount} yêu thích
          </span>
          <span className="rounded-full border border-jade-line bg-jade-wash px-3.5 py-[7px] text-[12.5px] font-bold text-jade-ink">
            📦 {total} cấu trúc
          </span>
        </div>
      </div>
      <Button
        onClick={onReview}
        className="min-h-[52px] max-w-[300px] rounded-[14px] px-[26px] text-[14px] leading-[1.4] shadow-[0_4px_14px_rgba(200,60,50,.28)]"
      >
        🎯 Luyện phản xạ cấu trúc hôm nay
      </Button>
    </section>
  );
}
