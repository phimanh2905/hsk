import { cn } from "@/lib/cn";

export function Progress({ value, max = 100, label, className }: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-sm text-text-primary">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className="h-full rounded-full bg-action-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums text-text-primary">{pct}%</span>
    </div>
  );
}
