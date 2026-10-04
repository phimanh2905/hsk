"use client";

/* Node tròn 56px giữa spine (port .node của opendesign_hsk/roadmap.html):
   done=Check jade, active=Play + pulse, locked=Lock muted; milestone là
   diamond 48px rotate-45 nền amber-wash (port .node.mile). */
import { Check, Lock, Play, Trophy, ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { StationState } from "@/lib/roadmap-progress";

export function StationNode({
  state,
  milestone = false,
  label,
  onClick,
}: {
  state: StationState;
  milestone?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 bg-surface-elevated transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "h-14 w-14 min-h-14 min-w-14",
        milestone
          ? "h-12 w-12 min-h-12 min-w-12 rotate-45 rounded-[15px] border-learning-streak bg-amber-wash text-amber-ink"
          : state === "done"
            ? "border-jade text-jade"
            : state === "active"
              ? "border-action-primary text-action-primary hz-node-ring hz-node-pulse"
              : "border-border-default bg-surface-muted text-text-secondary",
        state === "locked" && "cursor-not-allowed",
      )}
    >
      <span className={cn("grid place-items-center", milestone && "rotate-[-45deg]")} aria-hidden="true">
        {milestone ? (
          <Trophy size={20} strokeWidth={ICON_STROKE} />
        ) : state === "done" ? (
          <Check size={22} strokeWidth={2.6} />
        ) : state === "active" ? (
          <Play size={13} className="fill-current" strokeWidth={ICON_STROKE} />
        ) : (
          <Lock size={20} strokeWidth={ICON_STROKE} />
        )}
      </span>
    </button>
  );
}
