import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const shadows = {
  none: "",
  xs: "shadow-xs",
  md: "shadow-md",
} as const;

const tones = {
  neutral: "",
  rose: "bg-rose-wash border-learning-due/30",
  amber: "bg-amber-wash border-learning-streak/30",
  jade: "bg-jade-wash border-learning-mastered/30",
} as const;

export function Card({
  shadow = "xs",
  tone = "neutral",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  shadow?: keyof typeof shadows;
  tone?: keyof typeof tones;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-default bg-surface-elevated p-6",
        shadows[shadow],
        tone !== "neutral" && tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
