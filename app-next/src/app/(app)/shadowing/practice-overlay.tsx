"use client";
/* Practice overlay toàn màn hình — port #practice-session của shadowing.html (spec 2026-10-05).
   Nghe mẫu → nhại theo → chuyển câu; câu cuối ghi progress (done, score 88) + đóng. */
import { useEffect, useState } from "react";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import { useTts } from "@/lib/tts/use-tts";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { X, Volume2 } from "@/components/ui/icon";

export function PracticeOverlay({
  video,
  lines,
  onClose,
}: {
  video: ShadowingVideo;
  lines: SubtitleSentence[];
  onClose(): void;
}) {
  const { speak } = useTts();
  const { recordPractice } = useShadowingProgress();
  const toast = useToast();
  const [i, setI] = useState(0);

  const cur = lines[i];
  const zh = cur?.parts.map((p) => p.zh).join("") ?? "";

  /* Overlay là chủ nhân của Escape — capture + stopPropagation chống rò xuống shell. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  /* Tự đọc câu hiện tại khi mount / khi chuyển câu (port behavior practice-session). */
  useEffect(() => {
    speak(zh, { lang: "zh-CN", rate: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const next = () => {
    if (i >= lines.length - 1) {
      recordPractice(video.id, { status: "done", score: 88, linesDoneDelta: 0 });
      toast(`Hoàn thành “${video.title}” — đã cập nhật trạng thái`);
      onClose();
      return;
    }
    setI(i + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Luyện shadowing"
      data-od-id="practice-session"
      className="fixed inset-0 z-[60] bg-surface-paper flex flex-col"
    >
      <div className="border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto h-[60px] flex items-center gap-3 px-5">
          <IconButton
            label="Thoát bài luyện"
            className="size-9 min-h-9 min-w-9 shrink-0"
            onClick={onClose}
          >
            <X className="size-4" />
          </IconButton>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text-secondary truncate">
              Câu {i + 1} / {lines.length} · {video.title}
            </p>
            <div className="h-1.5 rounded-full bg-ring-track mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-feedback-success transition-[width]"
                style={{ width: `${(i / Math.max(1, lines.length)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid place-items-center max-w-[720px] mx-auto w-full px-5">
        <div className="text-center">
          <p className="hanzi text-[34px] leading-relaxed font-extrabold text-center">{zh}</p>
          <p className="text-base text-text-secondary mt-2">{cur?.pinyin}</p>
          {cur?.vi && (
            <p className="text-sm text-text-secondary mt-2">
              Câu {i + 1}/{lines.length} · {cur.vi}
            </p>
          )}
        </div>
      </div>

      <div className="pb-8 pt-2">
        <div className="max-w-[720px] mx-auto px-5 flex items-center justify-center gap-3">
          <Button variant="secondary" className="rounded-2xl min-h-[52px]" onClick={() => speak(zh, { lang: "zh-CN", rate: 0.8 })}>
            <Volume2 className="size-4" /> Nghe mẫu
          </Button>
          <Button className="rounded-2xl min-h-[52px]" onClick={next}>
            Đã đọc xong · câu sau
          </Button>
        </div>
        <p className="text-xs text-text-secondary text-center mt-3">
          Nghe → nhại theo → chuyển câu · <b>Esc</b> thoát
        </p>
      </div>
    </div>
  );
}
