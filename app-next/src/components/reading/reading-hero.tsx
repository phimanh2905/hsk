import Link from "next/link";

import type { ReadingLibItem } from "@/content/reading";
import { BookOpen, ICON_STROKE, Sparkles, Timer, Volume2 } from "@/components/ui/icon";

/* Hero "Bài đọc đề xuất hôm nay" — port mood từ opendesign_hsk/reading.html
   .hero/.kicker/.hpills. Thuần presentational: cta text do root truyền. */
export function ReadingHero({
  item,
  pct,
  cta,
}: {
  item: ReadingLibItem;
  pct: number;
  cta: string;
}) {
  const pills = [
    { icon: <Timer size={14} strokeWidth={ICON_STROKE} />, text: `${item.min} phút` },
    { icon: <BookOpen size={14} strokeWidth={ICON_STROKE} />, text: `${item.n} chữ` },
    { icon: <Sparkles size={14} strokeWidth={ICON_STROKE} />, text: `${item.nw} từ mới` },
    { icon: <Volume2 size={14} strokeWidth={ICON_STROKE} />, text: "Đọc bằng TTS" },
  ];

  return (
    <section
      data-od-id="reading-hero"
      aria-label="Bài đọc đề xuất"
      className="grid items-center gap-6 rounded-card border border-border-default bg-surface-elevated p-6 md:grid-cols-[1fr_auto]"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-learning-mastered">
          Bài đọc đề xuất hôm nay · {item.lv}
        </p>
        <h1 className="mt-1 text-[22px] leading-snug font-bold text-text-primary">{item.vi}</h1>
        <p className="zh mt-1 text-base font-normal text-text-secondary">
          {item.title} · {item.py}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pills.map((p) => (
            <span
              key={p.text}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-muted px-3.5 py-1.5 text-xs font-bold text-text-primary"
            >
              {p.icon}
              {p.text}
            </span>
          ))}
        </div>
        {pct > 0 && pct < 100 && (
          <p className="mt-3 text-xs font-semibold text-text-secondary">Đang đọc dở ({pct}%)</p>
        )}
      </div>
      <Link
        href={`/reading/${item.id}`}
        data-od-id="reading-cta"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      >
        {cta}
      </Link>
    </section>
  );
}

export default ReadingHero;
