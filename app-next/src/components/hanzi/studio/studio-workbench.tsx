"use client";

/* Bàn luyện chữ — port .panel#paneWork của opendesign_hsk/hanzi.html (radical-first redesign):
   wb-head (glyph + tên bộ/chữ + loa) + hộp bóc tách + mode-tabs + 2 toolbar + tray chữ HSK + mẹo nhớ.
   Animation/thiên tự/mực nằm ở StudioGrid; workbench lo UI xung quanh. */
import { useEffect, useState } from "react";
import { Lightbulb, Volume2 } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useTts } from "@/lib/tts/use-tts";
import type { StudioRadical, StudioCharMeta } from "@/content/hanzi-studio/radical-index";
import { cn } from "@/lib/cn";
import { SegControl } from "./seg-control";
import { StudioGrid, type StudioGridApi } from "./studio-grid";

export type { StudioGridApi };

export type WorkbenchData =
  | { kind: "rad"; rad: StudioRadical }
  | { kind: "char"; meta: StudioCharMeta; rad: StudioRadical; meaning?: string };

const SPEED_TABS = [
  { key: "0.75" as const, label: "0.75x" },
  { key: "1" as const, label: "1.0x" },
];

const TOOL_BTN = "rounded-2xl text-[12.5px] font-bold";

/* decomp lọc bỏ chính glyph của bộ (cả dạng từ điển 水 lẫn biến bộ 氵 đã khớp ở rad.char) */
function decompParts(meta: StudioCharMeta, rad: StudioRadical): string[] {
  return meta.decomp.filter((c) => c !== rad.char);
}

export function StudioWorkbench({
  data, mode, onMode, apiRef, hasStrokeData, onSelectTray,
}: {
  data: WorkbenchData | null; // null = không có data nét → panel fallback
  mode: "watch" | "draw";
  onMode: (m: "watch" | "draw") => void;
  apiRef: React.RefObject<StudioGridApi | null>;
  hasStrokeData: boolean;
  onSelectTray: (ch: string) => void;
}) {
  const { speak } = useTts();
  const [speed, setSpeed] = useState<"0.75" | "1">("1");
  const [hintOn, setHintOn] = useState(false);
  const glyph = data ? (data.kind === "rad" ? data.rad.char : data.meta.ch) : "";
  const rad = data?.rad;

  useEffect(() => {
    setSpeed("1");
    setHintOn(false);
    apiRef.current?.setHint(false); // grid không rebuild theo state workbench — bảo nó tắt hint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph]);

  /* Không có data nét: panel fallback, ẩn mọi control */
  if (!data || !hasStrokeData || !rad) {
    return (
      <section
        aria-label="Bàn luyện chữ"
        data-od-id="workbench"
        className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
      >
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          {glyph ? <span className="zh text-[44px] font-bold leading-[1.2] text-text-tertiary">{glyph}</span> : null}
          <p className="text-[13px] text-text-secondary">Chưa có data nét cho bộ/chữ này.</p>
        </div>
      </section>
    );
  }

  const isChar = data.kind === "char";
  const meta = isChar ? data.meta : null;
  /* mẹo nhớ: rad → rad.meaning; char → meaning truyền vào (thiếu → ẩn block) */
  const mnemonicText = isChar ? data.meaning : rad.meaning;
  const parts = meta ? decompParts(meta, rad) : [];

  return (
    <section
      aria-label="Bàn luyện chữ"
      data-od-id="workbench"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-3">
        <span className="zh text-[44px] font-bold leading-[1.2] text-text-primary">{glyph}</span>
        <div className="min-w-0">
          <b className="block text-[15px] leading-snug text-text-primary">
            {isChar ? `${meta!.py} · ${rad.hanViet}` : `${rad.hanViet} · ${rad.strokes} nét`}
          </b>
          {rad.meaning ? <span className="text-[12.5px] text-text-secondary">{rad.meaning}</span> : null}
        </div>
        <IconButton
          label="Phát âm"
          variant="ghost"
          className="h-8 min-h-8 w-8 min-w-8 rounded-full"
          onClick={() => speak(glyph, { rate: 0.85 })}
        >
          <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
        </IconButton>
      </div>

      {meta ? (
        <div
          data-od-id="decomp"
          className="mb-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px] text-text-secondary"
        >
          Bóc tách: Bộ{" "}
          <b className="zh text-[14px] text-text-primary">{rad.char}</b>
          {parts.length > 0 ? (
            <>
              {" "}+ <b className="text-text-primary">{parts.join(" + ")}</b>
            </>
          ) : null}
        </div>
      ) : null}

      <div data-od-id="mode-tabs" className="my-3">
        <SegControl
          label="Chế độ luyện"
          tabs={[
            { key: "watch" as const, label: "Xem bút thuận" },
            { key: "draw" as const, label: "Tự luyện viết" },
          ]}
          value={mode}
          onChange={onMode}
        />
      </div>

      <StudioGrid sel={{ kind: isChar ? "char" : "rad", g: glyph }} mode={mode} apiRef={apiRef} />

      <div data-od-id="watch-controls" className={cn("mt-3 flex flex-wrap items-center justify-center gap-2", mode !== "watch" && "hidden")}>
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.stepPrev?.()}>
            Nét trước
          </Button>
          <Button type="button" className={TOOL_BTN} onClick={() => apiRef.current?.play()}>
            Phát lại
          </Button>
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.stepNext?.()}>
            Nét sau
          </Button>
          <SegControl
            label="Tốc độ"
            radius="2xl"
            tabs={SPEED_TABS}
            value={speed}
            onChange={(k) => { setSpeed(k); apiRef.current?.setSpeed(parseFloat(k)); }}
          />
      </div>

      <div data-od-id="draw-controls" className={cn("mt-3 flex flex-wrap items-center justify-center gap-2", mode !== "draw" && "hidden")}>
          <Button
            type="button"
            variant="secondary"
            aria-pressed={hintOn}
            className={cn(TOOL_BTN, hintOn && "border-action-primary text-action-primary")}
            onClick={() => {
              const next = !hintOn;
              setHintOn(next);
              apiRef.current?.setHint(next);
            }}
          >
            <Lightbulb size={14} strokeWidth={1.5} aria-hidden="true" /> Gợi ý nét mờ
          </Button>
      </div>

      {rad.chars.length > 0 ? (
        <div data-od-id="char-tray" className="mt-3.5">
          <h4 className="mb-2 text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">CÁC CHỮ HSK CHỨA BỘ NÀY</h4>
          <div className="flex flex-wrap gap-2">
            {rad.chars.map((c) => {
              const active = isChar && meta!.ch === c.ch;
              return (
                <button
                  key={c.ch}
                  type="button"
                  data-tray={c.ch}
                  onClick={() => onSelectTray(c.ch)}
                  className={cn(
                    "flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl border px-3 py-1.5 text-center transition-colors",
                    active
                      ? "border-action-primary bg-rose-wash text-action-primary"
                      : "border-border-subtle bg-surface-muted text-text-primary hover:border-border-strong",
                  )}
                >
                  <span className="zh text-[20px] font-bold leading-tight">{c.ch}</span>
                  <span className="text-[10.5px] text-text-secondary">{c.py}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mnemonicText ? (
        <div
          data-od-id="mnemonic"
          className="mt-2.5 rounded-xl border border-learning-progress/35 bg-amber-wash px-3.5 py-2.5 text-[12.5px] text-text-secondary"
        >
          <b className="text-text-primary">Mẹo nhớ:</b> {mnemonicText}
        </div>
      ) : null}
    </section>
  );
}
