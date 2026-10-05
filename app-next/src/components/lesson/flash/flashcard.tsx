"use client";

/* Thẻ flashcard (port article[data-od-id="flashcard"] của opendesign lesson.html):
   counter → glyph → pinyin → speaker ripple + Xem nét viết → panel reveal → hint.
   Click card reveal; click nút con không reveal (stopPropagation, port closest check mockup). */

import { useEffect, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { pinyinLine } from "@/lib/pinyin-utils";
import { ICON_STROKE, PenTool, Volume2 } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Kbd } from "./kbd";

export function Flashcard({
  onOpenStroke,
  className,
}: {
  onOpenStroke?: () => void;
  className?: string;
}) {
  const { items, index, revealed, setRevealed, done } = useLesson();
  const { speak } = useTts();
  const [rippled, setRippled] = useState(false);
  const rippleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* dọn timer ripple khi unmount (tránh setState sau unmount) */
  useEffect(
    () => () => {
      if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    },
    []
  );

  const item = items[index];
  if (!item) return null;

  // custom deck (C10): fallback example.zh = hanzi → coi như không có ví dụ riêng
  const hasExample = Boolean(item.example) && item.example.zh !== item.hanzi;

  const playWord = () => {
    speak(item.hanzi, { lang: "zh-CN" });
    setRippled(true);
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => setRippled(false), 700); // khớp duration ripple .7s
  };

  const glyph = done ? "棒" : item.hanzi;
  const pinyin = done ? "bàng" : item.pinyin;
  const pos = done ? "Hoàn thành" : item.pos;
  const meaning = done
    ? `Xong ${items.length}/${items.length} từ — quay lại lộ trình để mở trạm tiếp theo`
    : item.meaning;

  return (
    <article
      data-od-id="flashcard"
      aria-live="polite"
      aria-label={done ? "Thẻ hoàn thành" : revealed ? "Thẻ đã lật, chấm điểm ghi nhớ bên dưới" : "Thẻ ghi nhớ, chạm để xem nghĩa"}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        if (done) return;
        if (!revealed) setRevealed(true);
        else playWord();
      }}
      className={cn(
        "mx-auto w-full max-w-[560px] cursor-pointer rounded-[24px] border border-border-default bg-surface-elevated px-8 pb-7 pt-9 text-center shadow-md transition-shadow hover:shadow-lg active:scale-[.99] max-[480px]:px-5",
        className,
      )}
    >
      <div className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-text-secondary">
        {done ? "HOÀN THÀNH" : `THẺ ${index + 1} / ${items.length}`}
      </div>
      <div className="hanzi mt-2.5 text-[68px] font-semibold leading-[1.35] tracking-[.08em] max-[480px]:text-[60px]">
        {glyph}
      </div>
      <div className="text-[21px] tracking-[.02em] text-text-secondary">{pinyin}</div>

      <div className="mt-3.5 flex items-center justify-center gap-3">
        <button
          type="button"
          data-od-id="audio-button"
          aria-label="Phát âm từ vựng"
          onClick={(e) => {
            e.stopPropagation();
            playWord();
          }}
          className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-surface-muted text-action-primary transition hover:-translate-y-px hover:brightness-95 focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
        >
          <Volume2 size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {rippled && <span aria-hidden="true" className="speaker-ripple" />}
        </button>
        {!done && (
          <button
            type="button"
            data-od-id="stroke-link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenStroke?.();
            }}
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[12.5px] font-bold text-text-secondary hover:text-action-primary"
          >
            <PenTool size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Xem nét viết
          </button>
        )}
      </div>

      {/* panel reveal (port .reveal/.reveal.open) — render có điều kiện để nội dung
          thực sự rời khỏi DOM khi chưa reveal (đọc màn/AT nhất quán). Vì không mount
          sẵn (mount/unmount thay vì max-height) nên không còn transition max-height. */}
      {(revealed || done) && (
      <div>
        <hr className="my-[18px] border-border-default" />
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="rounded-full border border-border-default bg-surface-muted px-3 py-1 text-[11.5px] font-extrabold tracking-[.06em] text-text-secondary">
            {pos}
          </span>
        </div>
        <p className="mt-2.5 text-base font-bold">{meaning}</p>
        {!done && hasExample && (
          <div className="mt-3.5 rounded-[16px] border border-border-default bg-surface-muted px-4 py-3.5 text-left">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="zh text-[17px] font-bold">{item.example.zh}</div>
                <div className="mt-0.5 text-[13px] text-text-secondary">
                  {pinyinLine(item.example.pinyinPerChar)}
                </div>
                <div className="mt-1 text-[13.5px] text-text-secondary">{item.example.vi}</div>
              </div>
              <button
                type="button"
                aria-label="Phát âm câu ví dụ"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(item.example.zh, { lang: "zh-CN" });
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border-default bg-surface-elevated text-text-secondary hover:border-action-primary hover:text-action-primary"
              >
                <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* hint (port #cardHint — đổi nội dung theo revealed) */}
      <p className="mt-3 text-xs text-text-secondary">
        {done ? (
          <>
            Nhấn <Kbd>Esc</Kbd> để về lộ trình
          </>
        ) : revealed ? (
          <>
            Chấm mức độ ghi nhớ bên dưới <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd>
          </>
        ) : (
          <>
            Chạm thẻ hoặc nhấn <Kbd>Space</Kbd> để xem nghĩa
          </>
        )}
      </p>
    </article>
  );
}
