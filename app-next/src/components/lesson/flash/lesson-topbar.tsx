"use client";

/* Topbar bài học (port header[data-od-id="lesson-topbar"] của opendesign lesson.html):
   tile thoát · nhãn tiến độ + track jade · autoplay/phím tắt/theme. Dùng chung mọi mode. */

import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/shell/theme-provider";
import { ICON_STROKE, Keyboard, SunMoon, Volume2, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/* Tile 40px của topbar (port .tile) — pressed có viền + dot accent (port [aria-pressed=true]::after) */
function TopbarTile({
  label,
  title,
  pressed,
  onClick,
  children,
}: {
  label: string;
  title: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "relative grid h-10 w-10 min-h-11 place-items-center rounded-control border border-transparent text-text-secondary transition-colors",
        "hover:bg-surface-muted hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
        pressed && "border-border-default bg-surface-muted text-action-primary",
      )}
    >
      {children}
      {pressed && (
        <span aria-hidden="true" className="absolute bottom-[5px] h-1 w-1 rounded-full bg-action-primary" />
      )}
    </button>
  );
}

export function LessonTopbar({
  title,
  current,
  total,
  autoplay,
  onToggleAutoplay,
  onExit,
  onShortcuts,
  className,
}: {
  title: ReactNode;
  current: number;
  total: number;
  autoplay: boolean;
  onToggleAutoplay(): void;
  onExit(): void;
  onShortcuts(): void;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <header
      data-od-id="lesson-topbar"
      className={cn(
        "sticky top-0 z-20 border-b border-border-default bg-surface-paper/88 px-4 py-2.5 backdrop-blur-md no-print",
        className,
      )}
    >
      <div className="mx-auto grid max-w-[880px] grid-cols-[auto_1fr_auto] items-center gap-3.5">
        <TopbarTile label="Thoát bài học" title="Thoát bài học" onClick={onExit}>
          <X size={17} strokeWidth={2.4} aria-hidden="true" />
        </TopbarTile>

        {/* tiến độ (port .progress-zone) */}
        <div className="min-w-0 text-center" data-od-id="lesson-progress">
          <Progress
            stacked
            tone="jade"
            ariaLabel="Tiến độ từ vựng"
            value={current}
            max={total}
            label={
              <span>
                {title} · <b className="font-bold text-text-primary">{current}/{total} từ ({pct}%)</b>
              </span>
            }
          />
        </div>

        <div className="flex gap-1" data-od-id="lesson-controls">
          <TopbarTile label="Tự động phát âm" title="Tự động phát âm" pressed={autoplay} onClick={onToggleAutoplay}>
            <Volume2 size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
          <TopbarTile label="Phím tắt" title="Phím tắt" onClick={onShortcuts}>
            <Keyboard size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
          <TopbarTile
            label="Chế độ sáng tối"
            title="Sáng / tối"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunMoon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
        </div>
      </div>
    </header>
  );
}
