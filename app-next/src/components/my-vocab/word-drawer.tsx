"use client";

/* Drawer chi tiết từ — port #drawer của mock: status pill, glyph, py/hv/mean,
   meta + speak + star, THỨ TỰ NÉT VIẾT (stroke data lookup), ô thiên tự + link
   Hanzi Studio, GHI CHÚ CÁ NHÂN + Lưu, Luyện từ này. Scrim do root render. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, X } from "@/components/ui/icon";
import { STROKE_DATA, STROKE_PATH_DATA } from "@/content/hanzi-strokes";
import type { VocabRow } from "@/lib/my-vocab";
import { useTts } from "@/lib/tts/use-tts";
import { cn } from "@/lib/cn";

const STATUS_META: Record<VocabRow["status"], { cls: string; label: string; dot: string }> = {
  master: { cls: "border-jade-line bg-jade-wash text-jade-ink", label: "Master", dot: "🟢" },
  study: { cls: "border-amber-line bg-amber-wash text-amber-ink", label: "Đang ôn", dot: "🟡" },
  new: { cls: "border-rose-line bg-rose-wash text-rose-ink", label: "Mới học", dot: "🔴" },
};

function strokesFor(zh: string): string[] {
  const ch = zh.charAt(0);
  const path = STROKE_PATH_DATA[ch];
  if (path) return path.order.map(([name, py]) => `${name} (${py})`);
  if (STROKE_DATA[ch]) return STROKE_DATA[ch].map((_, i) => `Nét ${i + 1}`);
  return ["Tra bút thuận trong Hanzi Studio"];
}

export function WordDrawer({
  row, onClose, onStar, onSaveNote, onPractice,
}: {
  row: VocabRow;
  onClose: () => void;
  onStar: (zh: string) => void;
  onSaveNote: (zh: string, note: string) => void;
  onPractice: (zh: string) => void;
}) {
  const { speak } = useTts();
  const [note, setNote] = useState(row.note);

  useEffect(() => setNote(row.note), [row.zh, row.note]); // đổi từ → reset textarea

  const m = STATUS_META[row.status];

  return (
    <aside
      data-od-id="vocab-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết từ vựng"
      className="fixed bottom-0 right-0 top-0 z-[51] flex w-[min(420px,100%)] flex-col overflow-y-auto border-l border-border-subtle bg-surface-elevated p-[22px]"
    >
      <div className="flex items-start justify-between gap-2.5">
        <span className={cn("rounded-full border px-[11px] py-[3px] text-[11px] font-extrabold", m.cls)}>
          {m.dot} {m.label}
        </span>
        <button
          type="button"
          aria-label="Đóng chi tiết"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-[10px] text-text-secondary hover:bg-surface-muted hover:text-text-primary"
        >
          <X size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <div className="zh mt-2 text-[56px] font-bold leading-[1.3] text-text-primary">{row.zh}</div>
      <div className="text-[15px] text-text-secondary">{row.py || "—"}</div>
      <div className="text-[11px] uppercase tracking-[0.1em] text-text-secondary">{row.hv || "—"}</div>
      <p className="mb-1 mt-2 text-[14.5px] text-text-primary">{row.vi || "—"}</p>

      <div className="mt-1 flex items-center gap-2 text-[12.5px] text-text-secondary">
        <span>{row.hsk}</span>·<span>{row.last}</span>
        <button
          type="button"
          aria-label="Phát âm"
          onClick={() => speak(row.zh, { rate: 0.85 })}
          className="ml-auto grid h-9 w-9 place-items-center rounded-[10px] border border-border-subtle bg-surface-muted text-text-secondary hover:text-action-primary"
        >
          <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={row.star ? "Bỏ gắn sao" : "Đánh dấu sao"}
          aria-pressed={row.star}
          onClick={() => onStar(row.zh)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-[10px] border border-border-subtle bg-surface-muted text-[16px]",
            row.star ? "text-learning-streak" : "text-text-secondary",
          )}
        >
          {row.star ? "★" : "☆"}
        </button>
      </div>

      <div data-od-id="stroke-order" className="my-3 rounded-xl border border-border-subtle bg-surface-muted p-3.5 text-[13px]">
        <b className="mb-1.5 block text-xs tracking-[0.06em] text-text-secondary/70">THỨ TỰ NÉT VIẾT</b>
        <ol className="grid list-decimal gap-[3px] pl-5 text-[12.5px] text-text-secondary">
          {strokesFor(row.zh).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>

      <div data-od-id="stroke-preview" className="mt-3 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
        <div
          aria-hidden="true"
          className="relative grid h-[110px] w-[110px] min-w-[110px] place-items-center overflow-hidden rounded-[10px] border border-border-subtle bg-surface-elevated"
        >
          <div className="absolute bottom-0 left-1/2 top-0 w-px bg-border-subtle opacity-60" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border-subtle opacity-60" />
          <span className="zh relative text-[64px] font-bold leading-none text-text-primary">{row.zh.charAt(0)}</span>
        </div>
        <div>
          <p className="text-[12.5px] text-text-secondary">Xem hoạt họa từng nét trong ô Điền Trĩ tại Hanzi Studio.</p>
          <Link
            href="/hanzi"
            className="mt-2 inline-flex min-h-11 items-center rounded-[10px] border border-action-primary px-4 text-[13px] font-bold text-action-primary hover:bg-rose-wash"
          >
            Mở Bàn luyện viết
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="d-note" className="text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">
          GHI CHÚ CÁ NHÂN
        </label>
        <textarea
          id="d-note"
          aria-label="GHI CHÚ CÁ NHÂN"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ câu, mẹo nhớ riêng của bạn…"
          className="mt-1.5 min-h-[88px] w-full resize-y rounded-xl border border-border-subtle bg-surface-muted px-3.5 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-action-primary"
        />
      </div>

      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          onClick={() => onSaveNote(row.zh, note)}
          className="min-h-12 flex-1 rounded-xl border border-border-subtle bg-surface-muted text-[13.5px] font-bold text-text-primary"
        >
          Lưu ghi chú
        </button>
        <button
          type="button"
          onClick={() => onPractice(row.zh)}
          className="min-h-12 flex-1 rounded-xl border border-action-primary bg-action-primary text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
        >
          Luyện từ này
        </button>
      </div>
    </aside>
  );
}
