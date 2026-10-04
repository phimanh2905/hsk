"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Toggle pill 2+ lựa chọn (port .hero-toggle của opendesign index.html — Lesson/SRS).
   aria-pressed thay vì role=tablist vì đây là trạng thái bấm độc lập, không panel liên quan. */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: ReadonlyArray<{ key: K; label: ReactNode }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-0.5 rounded-full border border-border-default bg-surface-muted p-[3px]", className)}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === value}
          onClick={() => onChange(t.key)}
          className={cn(
            "min-h-11 rounded-full px-3.5 text-[12.5px] font-bold transition-colors",
            t.key === value
              ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
