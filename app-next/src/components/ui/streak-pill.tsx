import { cn } from "@/lib/cn";
import { Flame, ICON_STROKE } from "@/components/ui/icon";

/* Streak pill 2 dạng (port .streak-mini topbar + .streak-pill glance của opendesign index.html).
   Amber owns streaks — không dùng màu khác (DESIGN.md). */
export function StreakPill({
  days,
  variant = "mini",
  unit,
  className,
}: {
  days: number;
  variant?: "mini" | "full";
  unit?: string;
  className?: string;
}) {
  if (variant === "mini") {
    return (
      <span
        title="Chuỗi ngày học liên tục"
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border-default bg-amber-wash px-3 text-[13px] font-bold text-amber-ink",
          className,
        )}
      >
        <Flame size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-learning-streak" />
        {days}
        {unit && <span className="font-semibold">{unit}</span>}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-control border border-border-default bg-surface-elevated p-2 pr-3.5 shadow-xs",
        className,
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-amber-wash">
        <Flame size={18} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-learning-streak" />
      </span>
      <div className="leading-tight">
        <b className="block text-sm">{days} ngày liên tục</b>
        <small className="block text-[11.5px] text-text-secondary">Streak · giữ lửa mỗi ngày</small>
      </div>
    </div>
  );
}
