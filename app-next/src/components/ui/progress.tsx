import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const toneFill = {
  jade: "bg-learning-mastered",
  vermilion: "bg-action-primary",
  amber: "bg-learning-progress",
} as const;

export function Progress({ value, max = 100, label, ariaLabel, gradient, tone = "vermilion", size = "md", stacked, className }: {
  value: number;
  max?: number;
  label?: ReactNode;
  ariaLabel?: string;
  gradient?: boolean;
  tone?: keyof typeof toneFill;
  size?: "sm" | "md";
  /** stacked: label trên, track mảnh dưới, ẩn % (port .progress-zone của opendesign lesson.html) */
  stacked?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  /* không có ariaLabel và label không phải string → BỎ attribute (không phát aria-label="") */
  const name: string | undefined = ariaLabel ?? (typeof label === "string" ? label : undefined);
  return (
    <div className={cn(stacked ? "flex min-w-0 flex-col items-stretch gap-1.5" : "flex items-center gap-3", className)}>
      {label && stacked && (
        <div className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-xs text-text-secondary">
          {label}
        </div>
      )}
      {label && !stacked && <span className="text-sm text-text-primary">{label}</span>}
      <div
        role="progressbar"
        {...(name ? { "aria-label": name } : {})}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        /* stacked: container là flex-col nên flex-1 ép chiều cao theo flex-basis 0
           → track vô hình. Ở layout dọc chỉ cần rộng đầy, cao lấy từ size. */
        className={cn("relative overflow-hidden rounded-full bg-border-subtle", stacked ? "w-full" : "flex-1", size === "sm" || stacked ? "h-1.5" : "h-2.5")}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            gradient ? "bg-gradient-to-r from-learning-mastered to-action-primary" : toneFill[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && !stacked && typeof label === "string" && (
        <span className="text-sm font-medium tabular-nums text-text-primary">{pct}%</span>
      )}
    </div>
  );
}
