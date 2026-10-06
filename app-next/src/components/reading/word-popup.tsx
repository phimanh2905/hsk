"use client";

/* WordPopup — popup 256px khi bấm một từ trong bài đọc (port mock, khác mock chủ ý:
   "Lưu từ" gọi handler thật — root nối vào vocabBook — không phải toast demo).
   Định vị gần anchorRect, clamp trong viewport; đóng bằng click ngoài hoặc Escape. */

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Volume2, ICON_STROKE } from "@/components/ui/icon";
import { useKeyboard } from "@/lib/use-keyboard";
import type { ReadingWord } from "@/content/reading";

const POPUP_W = 256;
const GAP = 8;

export function WordPopup({
  word,
  anchorRect,
  onClose,
  onSpeak,
  onSave,
  saved,
}: {
  word: ReadingWord;
  anchorRect: DOMRect;
  onClose: () => void;
  onSpeak: (word: ReadingWord) => void;
  onSave: (word: ReadingWord) => void;
  saved: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Clamp trong viewport (một lần sau mount — popup ngắn, không cần đo lại theo scroll).
  useEffect(() => {
    const w = ref.current?.offsetWidth ?? POPUP_W;
    const h = ref.current?.offsetHeight ?? 160;
    let left = Math.min(anchorRect.left, window.innerWidth - w - GAP);
    left = Math.max(GAP, left);
    let top = anchorRect.bottom + GAP;
    if (top + h > window.innerHeight - GAP) top = Math.max(GAP, anchorRect.top - h - GAP);
    setPos({ top, left });
  }, [anchorRect]);

  useKeyboard({ Escape: onClose });

  return (
    <div
      className="fixed inset-0 z-[2147482000]"
      onClick={(e) => {
        if (!ref.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={ref}
        data-od-id="word-popup"
        style={{
          width: POPUP_W,
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          visibility: pos ? "visible" : "hidden",
        }}
        className="absolute rounded-card border border-border-default bg-surface-elevated p-4 shadow-md"
      >
        <div className="zh text-3xl font-bold text-text-primary">{word.z}</div>
        <div className="mt-1 text-[12px] text-text-secondary">
          {word.p} · {word.h}
        </div>
        <div className="mt-1.5 text-[13px] text-text-primary">{word.m}</div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSpeak(word)}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-control border border-border-default bg-surface-muted px-2.5 text-[12.5px] font-bold text-text-primary hover:bg-surface-paper"
          >
            <Volume2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Nghe
          </button>
          <button
            type="button"
            onClick={() => {
              if (!saved) onSave(word);
            }}
            disabled={saved}
            className={
              saved
                ? "flex min-h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-control bg-jade-wash px-2.5 text-[12.5px] font-bold text-jade"
                : "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-jade-wash px-2.5 text-[12.5px] font-bold text-jade hover:brightness-95"
            }
          >
            {saved ? (
              <>
                <Check size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Đã lưu
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Lưu từ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
