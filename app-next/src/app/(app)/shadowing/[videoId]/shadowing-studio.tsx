"use client";
/* ShadowingStudio (port shadowing-video.html) — engine dùng usePlayerEngine;
   ghi chú: nút Ẩn video, checkbox show-vi/py, Cài đặt của player cũ bị bỏ theo mock. */
import { useState } from "react";
import Link from "next/link";
import { usePlayerEngine } from "@/components/shadowing/studio/use-player-engine";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/shell/toast-provider";
import { Play, Pause, Repeat, ChevronLeft, ICON_STROKE } from "@/components/ui/icon";

export default function ShadowingStudio({
  video,
  subtitles: subs,
  enginePostSink,
}: {
  video: ShadowingVideo;
  subtitles: SubtitleSentence[];
  enginePostSink?: (m: string) => void;
}) {
  const eng = usePlayerEngine({ subs, postSink: enginePostSink });
  const toast = useToast();
  const { progressMap } = useShadowingProgress();
  const rec = progressMap[video.id];
  const [subMode, setSubMode] = useState<0 | 1 | 2>(2); // 0: chỉ hanzi, 1: chỉ pinyin, 2: cả hai

  const linesDone = rec?.linesDone ?? 0;
  const pct = subs.length > 0 ? Math.round((linesDone / subs.length) * 100) : 0;

  return (
    <>
      <header
        className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border-subtle bg-surface-elevated/80 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6"
        data-od-id="studio-topbar"
        data-testid="studio-topbar"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/shadowing"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[13px] font-bold text-text-secondary hover:text-text-primary hover:border-border-subtle border border-transparent focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            <ChevronLeft size={14} strokeWidth={ICON_STROKE} /> Thư viện Shadowing
          </Link>
          <div className="min-w-0 truncate text-[13.5px] font-extrabold">
            <span className="hanzi">{video.title}</span>{" "}
            <small className="font-normal text-text-secondary">• {video.hsk} · {topicVi[video.topic]}</small>
          </div>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs font-bold text-text-secondary">
            <span>Tiến độ nói: {linesDone}/{subs.length} câu ({pct}%)</span>
            <span className="h-2 w-36 overflow-hidden rounded-full bg-ring-track">
              <i
                className="block h-full rounded-full bg-feedback-success transition-[width]"
                style={{ width: pct + "%" }}
                data-testid="studio-progress-fill"
              />
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-4 lg:w-[58%]" data-od-id="media-deck">
          <section aria-label="Trình phát video">
            <div
              className="relative aspect-video max-h-[250px] w-full overflow-hidden rounded-card border border-border-subtle bg-surface-muted"
              data-od-id="video-stage"
            >
              <iframe
                id="ytplayer"
                title={"YouTube video player — " + video.title}
                src={"https://www.youtube-nocookie.com/embed/" + video.id + "?enablejsapi=1&rel=0&playsinline=1"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {!eng.ytReady && (
                <div
                  data-testid="video-overlay"
                  className="absolute inset-0 grid place-items-center bg-surface-muted text-center"
                >
                  <div>
                    <span className="hanzi text-7xl text-white/20">{video.title.slice(0, 2)}</span>
                    <p className="mt-2 text-sm text-text-secondary">Video YouTube — cần kết nối mạng</p>
                    {eng.tts && (
                      <p className="text-sm text-feedback-warning">Dùng TTS đọc câu — không cần mạng cũng học được.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* player toolbar */}
            <div
              className="mt-2.5 flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface-elevated p-1.5 shadow-xs"
              data-od-id="player-toolbar"
              data-testid="player-toolbar"
            >
              <Button size="sm" variant="secondary" onClick={eng.togglePlay} aria-label="Phát / tạm dừng" data-play>
                {eng.playing ? <Pause size={16} strokeWidth={ICON_STROKE} /> : <Play size={16} strokeWidth={ICON_STROKE} />}
                {eng.playing ? "Tạm dừng" : "Phát"}
              </Button>
              <label className="flex min-w-[120px] flex-1 items-center gap-2 text-xs tabular-nums text-text-secondary">
                <span data-testid="t-cur">00:00</span>
                <input
                  type="range"
                  aria-label="Dòng thời gian"
                  min={0}
                  max={video.durSec}
                  defaultValue={0}
                  data-testid="scrub"
                  className="flex-1 accent-[var(--action-primary)]"
                />
                <span>{video.duration}</span>
              </label>
              <Chip tone="neutral" data-testid="pos" className="min-h-6 px-2 text-xs font-bold tabular-nums">
                Câu {eng.cur + 1}/{subs.length}
              </Chip>
              <Button
                size="sm"
                variant={eng.loop ? "primary" : "secondary"}
                onClick={eng.toggleLoop}
                aria-pressed={eng.loop}
                title="Lặp lại câu này (L)"
              >
                <Repeat size={14} strokeWidth={ICON_STROKE} /> Lặp câu
              </Button>
              <div
                role="group"
                aria-label="Tốc độ phát"
                className="flex gap-0.5 rounded-control border border-border-subtle bg-surface-muted p-0.5"
              >
                {[0.75, 0.85, 1].map((r) => (
                  <button
                    key={r}
                    onClick={() => eng.setRate(r)}
                    aria-pressed={eng.rate === r}
                    className={
                      "min-h-9 rounded-[9px] px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
                      (eng.rate === r ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
                    }
                  >
                    {r === 1 ? "1.0x" : r + "x"}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant={subMode !== 0 ? "primary" : "secondary"}
                onClick={() => {
                  const next = ((subMode + 1) % 3) as 0 | 1 | 2;
                  setSubMode(next);
                  toast(subMode === 0 ? "Phụ đề: chỉ chữ Hán" : next === 1 ? "Phụ đề: chỉ Pinyin" : "Phụ đề: Hán tự + Pinyin");
                }}
                aria-pressed={subMode !== 0}
                title="Phụ đề"
              >
                CC
              </Button>
            </div>
          </section>
          {/* SLOT-RECORD (Task 9): cắm waveform card + record dock vào đây */}
        </div>
        {/* SLOT-TRANSCRIPT (Task 8): cắm tabs + transcript + dictation vào đây */}
      </div>
    </>
  );
}
