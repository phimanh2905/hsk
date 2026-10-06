"use client";

/* Bàn luyện chữ — port .panel#paneWork của opendesign_hsk/hanzi.html:
   wb-head + mode-tabs + 2 toolbar (watch/draw) + meter + chips + tip.
   Animation/thiên tự/mực nằm ở StudioGrid; workbench lo UI + stats hiển thị. */
import { useEffect, useState } from "react";
import { Lightbulb, Volume2 } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useTts } from "@/lib/tts/use-tts";
import type { StudioChar } from "@/content/hanzi-studio";
import { cn } from "@/lib/cn";
import { SegControl } from "./seg-control";
import { StudioGrid, type StudioGridApi } from "./studio-grid";

export type { StudioGridApi };

const SPEED_TABS = [
  { key: "0.75" as const, label: "0.75x" },
  { key: "1" as const, label: "1.0x" },
  { key: "1.5" as const, label: "1.5x" },
];

const TOOL_BTN = "rounded-2xl text-[12.5px] font-bold";

export function StudioWorkbench({
  char, mode, onMode, apiRef,
}: {
  char: StudioChar;
  mode: "watch" | "draw";
  onMode: (m: "watch" | "draw") => void;
  apiRef: React.RefObject<StudioGridApi | null>;
}) {
  const { speak } = useTts();
  const [speed, setSpeed] = useState<"0.75" | "1" | "1.5">("1");
  const [hintOn, setHintOn] = useState(false);

  useEffect(() => {
    setSpeed("1");
    setHintOn(false);
    apiRef.current?.setHint(false); // grid không rebuild theo state workbench — bảo nó tắt hint
  }, [char]);
  const [radCh, ...radRest] = char.rad.split(" ");

  return (
    <section
      aria-label="Bàn luyện chữ"
      data-od-id="workbench"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-3">
        <span className="zh text-[44px] font-bold leading-[1.2] text-text-primary">{char.ch}</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold">
          {char.py}
          <IconButton
            label="Phát âm"
            variant="ghost"
            className="h-8 min-h-8 w-8 min-w-8 rounded-full"
            onClick={() => speak(char.ch + char.ch, { rate: 0.85 })}
          >
            <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </span>
        <span className="text-[13px] text-text-secondary">{char.mean}</span>
      </div>

      <div data-od-id="mode-tabs" className="my-3">
        <SegControl
          label="Chế độ luyện"
          tabs={[
            { key: "watch" as const, label: "Xem mẫu bút thuận" },
            { key: "draw" as const, label: "Tự luyện viết" },
          ]}
          value={mode}
          onChange={onMode}
        />
      </div>

      <StudioGrid sel={{ kind: "char", g: char.ch }} mode={mode} apiRef={apiRef} />

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

      <div data-od-id="char-meta" className="mt-3.5 flex flex-wrap gap-2">
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">BỘ THỦ</small>
          <b className="text-[13px]">
            <span className="zh text-learning-mastered">{radCh}</span> {radRest.join(" ")}
          </b>
        </div>
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">CẤU TRÚC</small>
          <b className="text-[13px]">{char.struct}</b>
        </div>
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">ÂM HÁN-VIỆT</small>
          <b className="text-[13px]">{char.hv}</b>
        </div>
      </div>

      <div
        data-od-id="mnemonic"
        className="mt-2.5 rounded-xl border border-learning-progress/35 bg-amber-wash px-3.5 py-2.5 text-[12.5px] text-text-secondary"
      >
        <b className="text-text-primary">Mẹo nhớ:</b> {char.tip}
      </div>
    </section>
  );
}
