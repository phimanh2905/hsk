"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { useStrokePlayer } from "@/components/hanzi/stroke-player";
import { STROKE_PATH_DATA } from "@/content/hanzi-strokes";
import { useTts } from "@/lib/tts/use-tts";
import { X, Volume2 } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const SPEEDS = [0.75, 1, 1.5] as const;

const TOOL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-border-default bg-surface-elevated px-3.5 text-[12.5px] font-bold hover:border-border-strong";

/* Stroke studio (mock .sheet, spec §3/§4): sheet modal thiên tự + bút thuận.
   Animation nét do useStrokePlayer lo; component này lo UI + chọn chữ + tốc độ. */
export function StrokeStudio({ word, onClose }: { word: string; onClose: () => void }) {
  const chars = useMemo(() => Array.from(new Set(word.split(""))), [word]);
  const [ch, setCh] = useState(chars[0]);
  const [speed, setSpeed] = useState<number>(1);
  const [cur, setCur] = useState(-1);
  const hostRef = useRef<HTMLDivElement>(null);
  const { speak } = useTts();

  useEffect(() => setCh(chars[0]), [chars]); // word đổi → về chữ đầu
  /* Đổi chữ → hook reset curRef lẫn speedRef về 1, nên state phải reset theo để
     seg tốc độ và playback khớp nhau (review F2), và con trỏ nét không lệch (F1). */
  useEffect(() => { setCur(-1); setSpeed(1); }, [ch]);

  const api = useStrokePlayer(hostRef, ch, undefined, { onStep: setCur });
  const entry = STROKE_PATH_DATA[ch];
  const total = api.total;
  /* hasCustomStrokes tính đồng bộ trong hook; api.source/total là state nên frame
     đầu còn "generic"/0 — đừng dựa vào nó để quyết định có data hay không (F1). */
  const hasData = !!entry || api.hasCustomStrokes;

  useEffect(() => { api.setSpeed(speed); }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Tự phát nét khi mở bảng và mỗi lần đổi chữ (mock: selectStroke() gọi playAll()).
     Nét do hook tự dựng trong effect riêng nên lịch qua rAF cho chắc; cleanup huỷ
     nếu đóng sheet/đổi chữ ngay. play() chỉ đụng refs nên giữ closure cũ cũng an. */
  useEffect(() => {
    const raf = requestAnimationFrame(() => api.play());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);

  const order: [string, string][] = entry
    ? entry.order
    : Array.from({ length: total }, (_, i) => [`Nét ${i + 1}`, ""] as [string, string]);

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="stroke-studio-title"
      className="w-[min(780px,calc(100%-32px))] max-w-none max-h-[min(620px,calc(100vh-48px))] overflow-y-auto rounded-[20px] p-5"
    >
      <h2 id="stroke-studio-title" className="sr-only">Nét chữ và bút thuận</h2>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Chọn chữ" className="flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-border-default bg-surface-muted p-[3px]">
          {chars.map((c) => (
            <button
              key={c}
              type="button"
              data-testid="char-tab"
              aria-pressed={c === ch}
              onClick={() => setCh(c)}
              className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold text-text-secondary aria-pressed:bg-surface-elevated aria-pressed:text-text-primary aria-pressed:shadow-xs"
            >
              <span className="zh text-base">{c}</span>
              {STROKE_PATH_DATA[c] && <small className="text-[11px] text-text-secondary/70">{STROKE_PATH_DATA[c].total} nét</small>}
            </button>
          ))}
        </div>
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold">
          {entry?.py ?? "—"}
          <button
            type="button"
            aria-label="Phát âm chữ Hán"
            onClick={() => speak(ch)}
            className="grid h-11 w-11 place-items-center rounded-full text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          >
            <Volume2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </span>
        <IconButton label="Đóng bảng nét chữ" variant="ghost" onClick={onClose} className="ml-auto">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          {/* grid-box: lưới thiên tự tĩnh (mock .grid-box) + SVG nét từ useStrokePlayer */}
          <div className="relative mx-auto aspect-square w-[min(300px,100%)] overflow-hidden rounded-card border border-border-default bg-surface-elevated">
            <svg viewBox="0 0 300 300" aria-hidden="true" className="absolute inset-0 h-full w-full">
              <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--border-default)" strokeWidth="1.5" rx="4" />
              <line x1="150" y1="4" x2="150" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="7 6" />
              <line x1="4" y1="150" x2="296" y2="150" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="7 6" />
              <line x1="4" y1="4" x2="296" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
              <line x1="296" y1="4" x2="4" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
            </svg>
            <div ref={hostRef} className="absolute inset-0" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className={TOOL} onClick={() => api.stepTo(cur - 1)}>Nét trước</button>
            <button
              type="button"
              className={cn(TOOL, "border-action-primary bg-action-primary text-white hover:bg-action-primary-hover")}
              onClick={() => api.play()}
            >
              Phát lại
            </button>
            <button type="button" className={TOOL} onClick={() => api.stepTo(cur + 1)}>Nét sau</button>
            <div role="group" aria-label="Tốc độ" className="flex gap-0.5 rounded-2xl border border-border-default bg-surface-muted p-[3px]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid="speed-btn"
                  aria-pressed={s === speed}
                  onClick={() => setSpeed(s)}
                  className="min-h-11 rounded-xl px-2.5 text-xs font-bold text-text-secondary aria-pressed:bg-surface-elevated aria-pressed:text-text-primary"
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2.5 rounded-xl border border-border-default bg-surface-elevated px-3 py-2.5 text-[12.5px] text-text-secondary">
            {entry ? (<><b className="text-learning-mastered">{entry.rad.name}</b> · {entry.rad.desc}</>) : (
              <>Chữ “{ch}” sẽ được bổ sung dữ liệu bút thuận.</>
            )}
          </p>
          <div aria-label="Danh sách bút thuận" className="max-h-41 overflow-y-auto rounded-card border border-border-default bg-surface-elevated p-2">
            {hasData ? (
              order.map(([name, py], i) => (
                <button
                  key={i}
                  type="button"
                  data-testid="order-row"
                  onClick={() => api.stepTo(i)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-[13px]",
                    i === cur && "bg-surface-muted shadow-[inset_3px_0_0_var(--action-primary)]",
                  )}
                >
                  <span className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold",
                    i === cur ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted",
                  )}>
                    {i + 1}
                  </span>
                  <span>{name}</span>
                  {py && <small className="ml-auto text-xs text-text-secondary">{py}</small>}
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-[13px] text-text-secondary">Chưa có dữ liệu nét cho chữ này.</div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
