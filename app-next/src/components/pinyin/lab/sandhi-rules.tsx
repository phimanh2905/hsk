"use client";

/* Sandhi — port #sandhiPane/.rule/.exbtn của mock: 3 quy tắc biến âm + ví dụ phát âm. */
import { PINYIN_LAB_SANDHI } from "@/content/pinyin-lab";

export function SandhiRules({ onSpeak }: { onSpeak: (s: string) => void }) {
  return (
    <div data-od-id="sandhi-rules" className="grid gap-3">
      {PINYIN_LAB_SANDHI.map((r) => (
        <article key={r.t} data-rule className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs">
          <h3 className="text-[15px] font-bold text-text-primary">{r.t}</h3>
          <p className="mb-2.5 mt-1.5 text-[13px] text-text-secondary">{r.d}</p>
          <div className="flex flex-wrap gap-2">
            {r.ex.map(([py, zh, vi]) => (
              <button
                key={py}
                type="button"
                onClick={() => onSpeak(py)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface-muted px-3 py-2 text-[13px] font-bold text-text-primary hover:border-action-primary hover:text-action-primary"
              >
                {py} · <span className="zh">{zh}</span>{" "}
                <small className="font-normal text-text-secondary">{vi}</small>
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
