"use client";

/* Tone lab — port .tones/.tone/.ex/.spk của opendesign_hsk/pinyin.html: 4 card
   thanh điệu với SVG contour + ví dụ mā má mǎ mà + speaker (pop khi phát). */
import { useState, type ReactNode } from "react";
import { Volume2 } from "@/components/ui/icon";
import { PINYIN_LAB_TONE_CARDS } from "@/content/pinyin-lab";
import { useTts } from "@/lib/tts/use-tts";
import { cn } from "@/lib/cn";

const CONTOUR: Record<string, ReactNode> = {
  flat: <line x1="8" y1="10" x2="112" y2="10" />,
  up: <line x1="8" y1="36" x2="112" y2="10" />,
  dip: <polyline points="8,10 60,36 112,22" />,
  down: <line x1="8" y1="10" x2="112" y2="36" />,
};

export function ToneLab() {
  const { speak } = useTts();
  const [playing, setPlaying] = useState<string | null>(null);

  const say = (py: string) => {
    setPlaying(py);
    window.setTimeout(() => setPlaying((cur) => (cur === py ? null : cur)), 500);
    speak(py, { rate: 0.95 });
  };

  return (
    <div data-od-id="tone-lab" className="mb-4 grid grid-cols-1 gap-3 min-[461px]:grid-cols-2 min-[861px]:grid-cols-4">
      {PINYIN_LAB_TONE_CARDS.map((c) => (
        <article
          key={c.name}
          className="rounded-card border border-border-subtle bg-surface-elevated p-4 shadow-xs transition-transform hover:-translate-y-0.5"
        >
          <h3 className="text-[13.5px] font-bold text-text-primary">
            {c.name} <small className="font-medium text-text-secondary">{c.sub}</small>
          </h3>
          <svg
            viewBox="0 0 120 44"
            aria-hidden="true"
            className="my-2.5 block h-11 w-full"
            stroke="var(--learning-progress)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {CONTOUR[c.contour]}
          </svg>
          <div className="flex items-center gap-2 rounded-[10px] border border-border-subtle bg-surface-muted px-2.5 py-2">
            <span>
              <b className="text-sm text-text-primary">{c.ex.py}</b>{" "}
              <small className="text-xs font-medium text-text-secondary">
                <span className="zh">{c.ex.zh}</span> · {c.ex.vi}
              </small>
            </span>
            <button
              type="button"
              aria-label={`Nghe ${c.ex.py}`}
              onClick={() => say(c.ex.py)}
              className={cn(
                "ml-auto grid h-[34px] w-[34px] min-w-[34px] place-items-center rounded-full border border-border-subtle bg-surface-elevated text-action-primary hover:border-action-primary",
                playing === c.ex.py && "animate-[pop_0.5s_ease]",
              )}
            >
              <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
