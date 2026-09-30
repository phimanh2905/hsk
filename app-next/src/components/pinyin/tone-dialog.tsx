"use client";

/* Popup chi tiết âm tiết — port từ clone/js/pinyin.js:74-117.
   Âm to + 4 nút thanh điệu (ā á ǎ à) + từ ví dụ; đóng X / Escape / backdrop. */

import { useEffect } from "react";
import { pinyinExamples } from "@/content/pinyin";
import { toPinyin } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";

export default function ToneDialog({
  syllable,
  onClose,
}: {
  syllable: string;
  onClose: () => void;
}) {
  const { speak } = useTts();
  const examples = pinyinExamples[syllable] ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card shadow-neo w-full max-w-sm p-5" role="dialog" aria-label="Chi tiết âm tiết">
        <div className="flex items-center justify-between mb-2">
          <span className="pill text-xs py-0.5 font-bold">{syllable}</span>
          <button type="button" onClick={onClose} className="btn-ghost w-9 h-9" aria-label="Đóng">
            ✕
          </button>
        </div>
        <h2 className="text-5xl font-extrabold text-center my-3">{syllable}</h2>
        <p className="text-xs font-bold text-center text-nhai-muted mb-3">Bấm để nghe 4 thanh điệu</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((t) => {
            const marked = toPinyin(syllable + t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => speak(marked, { lang: "zh-CN" })}
                className="btn-ghost px-3 py-2 text-lg font-bold"
              >
                {marked}
              </button>
            );
          })}
        </div>
        {examples.length ? (
          <div className="border-t-2 border-nhai-border pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-nhai-muted mb-2">Từ ví dụ</p>
            {examples.map(([hanzi, pinyin, meaning]) => (
              <button
                key={hanzi}
                type="button"
                onClick={() => speak(pinyin, { lang: "zh-CN" })}
                className="w-full flex items-baseline gap-2 py-1 text-left hover:text-nhai-main"
              >
                <span className="text-xl font-bold">{hanzi}</span>
                <span className="text-sm font-semibold">{pinyin}</span>
                <span className="text-xs text-nhai-muted ml-auto">{meaning}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-nhai-muted border-t-2 border-nhai-border pt-3">
            Chưa có từ ví dụ cho âm này.
          </p>
        )}
      </div>
    </div>
  );
}
