import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "vermilion" | "amber" | "jade";

const toneClass: Record<Tone, string> = {
  neutral: "text-text-primary",
  vermilion: "text-action-primary",
  amber: "text-learning-streak",
  jade: "text-learning-mastered",
};

/* Ô vuông chứa icon (port .icon-tile của opendesign index.html — habit cards + quick tools). */
export function IconTile({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border-default bg-surface-muted",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
