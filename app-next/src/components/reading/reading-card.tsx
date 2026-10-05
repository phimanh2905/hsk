"use client";

import Link from "next/link";
import { Star } from "@/components/ui/icon";

import type { ReadingLibItem } from "@/content/reading";
import { ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";

/* Card bài đọc trong grid thư viện — port mood từ opendesign_hsk/reading.html
   .card/.lv/.dur/.ex. Thuần presentational: note/cta do root tính qua
   noteFor/ctaFor rồi truyền string; star chỉ bắn onToggleSave lên store. */
export function ReadingCard({
  item,
  pct,
  saved,
  note,
  cta,
  onToggleSave,
}: {
  item: ReadingLibItem;
  pct: number;
  saved: boolean;
  /** noteFor(item, progress) do root tính — chỉ hiển thị. */
  note: string;
  /** ctaFor(progress) do root tính — text nút "Đọc ngay/Đọc tiếp/Đọc lại". */
  cta: string;
  onToggleSave: (id: string) => void;
}) {
  return (
    <article
      data-od-id={`read-${item.id}`}
      className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border-default bg-jade-wash px-2.5 py-0.5 text-xs font-bold text-learning-mastered">
            {item.lv}
          </span>
          <span className="text-xs font-semibold text-text-secondary">{item.min} phút</span>
        </div>
        <IconButton
          label={saved ? "Bỏ lưu" : "Lưu bài"}
          aria-pressed={saved}
          onClick={() => onToggleSave(item.id)}
          className={
            saved
              ? "border-transparent bg-amber-wash text-amber-ink"
              : undefined
          }
        >
          <Star
            size={16}
            strokeWidth={ICON_STROKE}
            fill={saved ? "currentColor" : "none"}
          />
        </IconButton>
      </div>

      <div className="min-w-0">
        <h3 className="zh text-lg font-bold leading-snug text-text-primary">{item.title}</h3>
        <p className="zh mt-0.5 text-sm font-normal text-text-secondary">{item.py}</p>
        <p className="mt-1 text-sm font-semibold text-text-primary">{item.vi}</p>
      </div>

      <p className="line-clamp-2 text-sm text-text-secondary">{item.ex}</p>

      {pct > 0 && (
        <Progress value={pct} tone="jade" size="sm" ariaLabel={`Tiến độ ${item.vi}: ${pct}%`} />
      )}

      <p className="text-xs font-semibold text-text-secondary">{note}</p>

      <Link
        href={`/reading/${item.id}`}
        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-control border border-border-default bg-transparent px-4 text-sm font-semibold text-text-primary hover:border-action-primary hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      >
        {cta}
      </Link>
    </article>
  );
}

export default ReadingCard;
