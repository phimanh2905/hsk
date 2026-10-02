"use client";

/* Popup chi tiết âm tiết — port từ clone/js/pinyin.js:74-117.
   Âm to + 4 nút thanh điệu (ā á ǎ à) + từ ví dụ; đóng X / Escape / backdrop.
   Thanh điệu mã hóa kép: dấu thanh (shape) + số thứ tự (label) — không chỉ màu. */

import { pinyinExamples } from "@/content/pinyin";
import { toPinyin } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icon";

const TONE_LABELS: Record<number, string> = { 1: "ngang", 2: "huyền", 3: "sắc", 4: "nặng" };

export default function ToneDialog({
  syllable,
  onClose,
}: {
  syllable: string;
  onClose: () => void;
}) {
  const { speak } = useTts();
  const examples = pinyinExamples[syllable] ?? [];

  return (
    <Dialog open onClose={onClose} labelledBy="tone-dialog-title" className="max-w-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <span
          id="tone-dialog-title"
          className="inline-flex items-center min-h-11 rounded-control border border-border-default bg-surface-elevated px-3 text-xs font-bold"
        >
          {syllable}
        </span>
        <IconButton label="Đóng" variant="ghost"  onClick={onClose}>
          <X size={18} strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
      </div>
      <h2 className="text-5xl font-extrabold text-center my-3 zh">{syllable}</h2>
      <p className="text-xs font-bold text-center text-text-secondary mb-3">Bấm để nghe 4 thanh điệu</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[1, 2, 3, 4].map((t) => {
          const marked = toPinyin(syllable + t);
          return (
            <Button
              key={t}
              type="button"
              variant="secondary"
              onClick={() => speak(marked, { lang: "zh-CN" })}
              className="flex-col px-2 py-2 gap-0.5"
              title={`Thanh ${t} (${TONE_LABELS[t]})`}
            >
              <span className="text-lg font-bold zh leading-tight">{marked}</span>
              <span className="text-[10px] font-bold text-text-secondary leading-tight">
                {t} · {TONE_LABELS[t]}
              </span>
            </Button>
          );
        })}
      </div>
      {examples.length ? (
        <div className="border-t border-border-default pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Từ ví dụ</p>
          {examples.map(([hanzi, pinyin, meaning]) => (
            <button
              key={hanzi}
              type="button"
              onClick={() => speak(pinyin, { lang: "zh-CN" })}
              className="w-full flex items-baseline gap-2 py-1 text-left hover:text-action-primary"
            >
              <span className="text-xl font-bold">{hanzi}</span>
              <span className="text-sm font-semibold">{pinyin}</span>
              <span className="text-xs text-text-secondary ml-auto">{meaning}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-secondary border-t border-border-default pt-3">
          Chưa có từ ví dụ cho âm này.
        </p>
      )}
    </Dialog>
  );
}
