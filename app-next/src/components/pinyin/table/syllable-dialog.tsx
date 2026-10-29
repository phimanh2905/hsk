"use client";
/* Dialog chi tiết 1 âm tiết: 5 nút thanh (tone 1-5) + ví dụ từ pinyinExamples.
   TTS qua useTts (Kokoro) — rate 0.95, chậm 0.65. Pure presentational.
   Export riêng để test độc lập với SyllableTable. */
import { useState } from "react";
import { Volume2 } from "@/components/ui/icon";
import { toneForms, type Tone } from "@/lib/pinyin/tone-mark";
import { examplesFor, type SyllableCell } from "@/lib/pinyin/syllable-table-data";
import { useTts } from "@/lib/tts/use-tts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const TONE_LABELS = ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4", "Thanh nhẹ"];

export function SyllableDialog({ cell, onClose }: { cell: SyllableCell; onClose: () => void }) {
  const { speak } = useTts();
  const [tone, setTone] = useState<Tone>(1);
  const forms = toneForms(cell.base);
  const examples = examplesFor(cell.base);

  return (
    <Dialog open onClose={onClose} labelledBy="syllable-dialog-title" role="dialog">
      <div className="flex items-center gap-3">
        <h2 id="syllable-dialog-title" className="zh text-3xl font-bold text-text-primary">
          {forms[tone - 1]}
        </h2>
        <span className="rounded-full border border-border-subtle bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
          {cell.initial === "Ø" ? "không thanh mẫu" : cell.initial} · {cell.final}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {forms.map((form, i) => (
          <button
            key={form}
            type="button"
            onClick={() => {
              setTone((i + 1) as Tone);
              speak(form, { rate: 0.95 });
            }}
            aria-pressed={tone === i + 1}
            className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-card border px-1 py-1.5 text-sm font-bold transition-colors ${
              tone === i + 1
                ? "border-action-primary bg-action-primary text-white"
                : "border-border-subtle bg-surface-paper text-text-primary hover:bg-surface-muted"
            }`}
          >
            <span className="zh">{form}</span>
            <span className="text-[10px] font-normal text-text-secondary">{TONE_LABELS[i]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={() => speak(forms[tone - 1], { rate: 0.65 })}>
          <Volume2 className="size-4" aria-hidden="true" /> Nghe chậm
        </Button>
      </div>

      {examples.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-text-primary">Ví dụ</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {examples.map(([hanzi, py, vi]) => (
              <li key={hanzi} className="flex items-baseline gap-2 text-sm">
                <span className="zh text-lg text-text-primary">{hanzi}</span>
                <span className="zh text-text-secondary">{py}</span>
                <span className="text-text-secondary">{vi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
