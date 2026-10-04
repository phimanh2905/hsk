import { cn } from "@/lib/cn";

export function Progress({ value, max = 100, label, ariaLabel, gradient, className }: {
  value: number;
  max?: number;
  label?: string;
  ariaLabel?: string;
  gradient?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const name = ariaLabel ?? label ?? "";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="text-sm text-text-primary">{label}</span>}
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            gradient ? "bg-gradient-to-r from-learning-mastered to-action-primary" : "bg-action-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <span className="text-sm font-medium tabular-nums text-text-primary">{pct}%</span>}
    </div>
  );
}
