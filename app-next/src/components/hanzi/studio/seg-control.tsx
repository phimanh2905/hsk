"use client";

/* Segmented góc bo nhẹ (rounded-12/16) — port .mode-tabs/.speed-seg/.pane-tabs của
   opendesign_hsk/hanzi.html. KHÔNG dùng SegmentedTabs (rounded-full) cho 3 chỗ này —
   mock chúng là khung chữ nhật bo. API mirror SegmentedTabs. */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SegControl<K extends string>({
  tabs,
  value,
  onChange,
  label,
  radius = "xl",
  className,
}: {
  tabs: ReadonlyArray<{ key: K; label: ReactNode }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
  radius?: "xl" | "2xl";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-0.5 border border-border-default bg-surface-muted p-[3px]",
        radius === "2xl" ? "rounded-2xl" : "rounded-xl",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === value}
          onClick={() => onChange(t.key)}
          className={cn(
            "min-h-11 flex-1 rounded-[9px] px-3 text-[13px] font-bold transition-colors",
            t.key === value
              ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
              : "border border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
