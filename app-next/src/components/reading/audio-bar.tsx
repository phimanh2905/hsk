"use client";

/* AudioBar — thanh phát âm đáy màn hình (port mock, khác mock chủ ý: KHÔNG giả lập
   theo giây — trackbar chia N đoạn bằng số câu, ↺ lùi 1 câu). Rate cycle do root lo
   (bar chỉ bắn onRate). Định vị: như bottom-nav — full-width, desktop chừa sidebar 256px. */

import { useRef } from "react";
import { Pause, Play, RotateCcw, ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioBar({
  playing,
  index,
  total,
  rate,
  onPlayPause,
  onSeek,
  onRate,
  onReplay,
  durationSec,
}: {
  playing: boolean;
  index: number;
  total: number;
  rate: number;
  onPlayPause: () => void;
  onSeek: (i: number) => void;
  onRate: () => void;
  onReplay: () => void;
  durationSec: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el || total === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
    // Map ratio → index câu (cùng công thức với sentenceAtRatio của lib, vốn cần
    // mảng câu — bar chỉ biết total nên tính local, tránh dựng mảng giả).
    const i = Math.min(total - 1, Math.max(0, Math.floor(safe * total)));
    onSeek(i);
  };

  const elapsed = Math.round(durationSec * ((index + 0.5) / Math.max(1, total)));

  return (
    <div
      data-od-id="karaoke-bar"
      className="fixed inset-x-0 bottom-0 z-[450] lg:pl-64"
    >
      <div className="flex items-center gap-3 border-t border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] px-4 py-2.5 backdrop-blur-xl">
        {/* Play/pause tròn */}
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-jade text-white shadow-xs hover:brightness-110"
        >
          {playing ? (
            <Pause size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          ) : (
            <Play size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
        </button>

        {/* Lùi 1 câu */}
        <button
          type="button"
          onClick={onReplay}
          aria-label="Lùi một câu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control text-text-secondary hover:text-text-primary"
        >
          <RotateCcw size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>

        {/* Timecode ước lượng */}
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-text-secondary">
          {fmt(elapsed)} / {fmt(durationSec)}
        </span>

        {/* Trackbar chia N đoạn bằng số câu */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="Vị trí câu trong bài"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, total - 1)}
          aria-valuenow={index}
          tabIndex={0}
          onClick={(e) => seekFromEvent(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              onSeek(index + (e.key === "ArrowRight" ? 1 : -1));
            }
          }}
          className="relative flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[3px]"
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "min-w-[2px] flex-1 rounded-full transition-colors",
                i <= index ? "bg-jade" : "bg-ring-track",
              )}
              style={{ height: i === index ? 8 : 5 }}
            />
          ))}
        </div>

        {/* Tốc độ — cycle do root lo */}
        <button
          type="button"
          onClick={onRate}
          aria-label="Đổi tốc độ đọc"
          className="shrink-0 rounded-control border border-border-default bg-surface-muted px-2.5 py-1.5 text-[12px] font-bold tabular-nums text-text-primary hover:bg-surface-paper"
        >
          {rate}×
        </button>
      </div>
    </div>
  );
}
