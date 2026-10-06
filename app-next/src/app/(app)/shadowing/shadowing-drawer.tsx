"use client";
/* Script drawer xem trước hội thoại — port #script-drawer của shadowing.html (spec 2026-10-05). */
import { useEffect } from "react";
import Link from "next/link";
import { topicVi, type ShadowingVideo, type SubtitleSentence } from "@/content/shadowing";
import { useTts } from "@/lib/tts/use-tts";
import { IconButton } from "@/components/ui/icon-button";
import { X, Volume2 } from "@/components/ui/icon";

export function ShadowingDrawer({
  video,
  lines,
  onClose,
}: {
  video: ShadowingVideo;
  lines: SubtitleSentence[];
  onClose(): void;
}) {
  const { speak } = useTts();

  /* Drawer khi mở là chủ nhân của Escape — capture + stopPropagation trước khi đóng
     để Escape không rò xuống shell (command palette, hotkey lesson...). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const first = lines[0];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Xem trước hội thoại"
        data-od-id="script-drawer"
        className="fixed inset-y-0 right-0 z-[51] w-[min(400px,100%)] overflow-y-auto bg-surface-elevated border-l border-border-subtle p-5 shadow-md"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="hanzi text-[17px] font-extrabold leading-snug">{video.title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {first?.pinyin} · {video.hsk} · {video.duration}
            </p>
            {first?.vi && <p className="text-[13px] text-text-secondary mt-0.5">{first.vi} — {topicVi[video.topic]}</p>}
          </div>
          <IconButton label="Đóng" className="size-9 min-h-9 min-w-9 shrink-0" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="mt-3">
          {lines.map((line, idx) => {
            const zh = line.parts.map((p) => p.zh).join("");
            return (
              <div key={line.n ?? idx} className="rounded-xl border border-border-default bg-surface-muted p-3 mt-2.5 first:mt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="hanzi text-[15.5px] font-bold leading-relaxed">{zh}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{line.pinyin}</p>
                    {line.vi && <p className="text-[13px] text-text-secondary mt-0.5">{line.vi}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Nghe câu thoại"
                    onClick={() => speak(zh)}
                    className="shrink-0 size-8 min-h-8 min-w-8 rounded-full border border-border-default bg-surface-elevated inline-flex items-center justify-center text-text-secondary hover:text-action-primary hover:border-action-primary transition focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href={"/shadowing/" + video.id}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active border-transparent font-semibold min-h-[52px] px-5 text-[15px] focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
        >
          Mở bài luyện đầy đủ
        </Link>
      </aside>
    </>
  );
}
