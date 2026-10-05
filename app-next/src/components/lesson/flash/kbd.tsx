import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Phím tắt kbd (port .hint kbd + .keys kbd của opendesign lesson.html). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-block font-sans text-[11px] font-bold leading-[1.5] rounded-[5px] border border-border-default bg-surface-muted px-[7px] py-px text-text-secondary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
