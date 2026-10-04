import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "selected" | "correct" | "error" | "streak" | "ai" | "doing" | "todo" | "idle";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-elevated text-text-primary border-border-default",
  selected: "bg-action-primary text-white border-transparent",
  correct: "bg-surface-elevated text-feedback-success border-feedback-success",
  error: "bg-surface-elevated text-feedback-error border-feedback-error",
  streak: "bg-surface-elevated text-learning-streak border-learning-streak",
  ai: "bg-surface-elevated text-feature-ai border-feature-ai",
  /* status habit cards (spec 2026-10-04) */
  doing: "bg-surface-muted text-text-primary border-border-default",
  todo: "bg-amber-wash text-amber-ink border-[color-mix(in_srgb,var(--hz-amber)_35%,var(--hz-line))]",
  idle: "bg-transparent text-text-secondary border-transparent",
};

export function Chip({
  selected,
  tone: toneProp,
  icon,
  onClick,
  className,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "onClick"> & {
  selected?: boolean;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
}) {
  const tone: Tone = toneProp ?? (selected ? "selected" : "neutral");
  const classes = cn(
    "inline-flex items-center gap-1.5 min-h-11 rounded-control border px-3 text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    tones[tone],
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {icon}
        {children}
      </button>
    );
  }
  return (
    <span className={classes} {...rest}>
      {icon}
      {children}
    </span>
  );
}
