"use client";

/* Card điểm ngữ pháp — port .gcard của mock: lvl pill, title, ★/⋮, def, formula
   blocks, pitfall (Bẫy người Việt), examples + 🔊, footer link review. */
import { Fragment } from "react";
import Link from "next/link";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import type { GrammarPoint } from "@/content/grammar-points";
import { cn } from "@/lib/cn";

export function GrammarCard({
  point, saved, onToggleSave, onMenu,
}: {
  point: GrammarPoint;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onMenu: (id: string) => void;
}) {
  const { speak } = useTts();
  const toast = useToastSafe();
  const playExample = (hz: string) => {
    // Mock hiển thị "Đang phát âm: {sent}" mỗi lần bấm 🔊
    toast(`Đang phát âm: ${hz}`);
    speak(hz, { rate: 0.95 });
  };

  return (
    <article
      data-od-id={`grammar-${point.id}`}
      className="flex flex-col gap-3 rounded-[20px] border border-border-subtle bg-surface-elevated/85 p-5 shadow-xs transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-full border border-jade-line bg-jade-wash px-2.5 py-[3px] text-[10.5px] font-bold" style={{ color: "var(--hz-jade-ink, #144d38)" }}>
          {point.level}
        </span>
        <div className="text-[15px] font-bold leading-[1.4] text-text-primary">
          📌 {point.title} <span className="zh text-[17px]">({point.hz})</span>
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label="Lưu cấu trúc"
            aria-pressed={saved}
            onClick={() => onToggleSave(point.id)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-[9px] border border-border-subtle bg-surface-elevated text-[15px]",
              saved ? "border-amber-line bg-amber-wash text-amber-ink" : "text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            ★
          </button>
          <button
            type="button"
            aria-label="Tùy chọn"
            onClick={() => onMenu(point.id)}
            className="grid h-9 w-9 place-items-center rounded-[9px] border border-border-subtle bg-surface-elevated text-[15px] text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            ⋮
          </button>
        </div>
      </div>

      <p className="text-[13px] text-text-secondary">{point.def}</p>

      <div
        data-formula
        aria-label="Công thức cấu trúc"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border-subtle bg-surface-paper px-3 py-2.5"
      >
        {point.formula.map(([label, key], i) => (
          <Fragment key={label + i}>
            {i > 0 && <span data-plus className="text-xs font-bold text-text-secondary/70">+</span>}
            <span
              data-block={key === "key" ? "key" : "plain"}
              className={cn(
                "whitespace-nowrap rounded-lg border px-[11px] py-[5px] text-[12.5px] font-bold",
                key === "key"
                  ? "zh border-learning-mastered bg-jade-wash text-[14px] text-[color:var(--hz-jade-ink,#144d38)]"
                  : "border-border-subtle bg-surface-muted text-text-primary",
              )}
            >
              {label}
            </span>
          </Fragment>
        ))}
      </div>

      <div data-pitfall className="flex gap-2 rounded-[10px] border border-amber-line border-l-[3px] border-l-learning-progress bg-amber-wash px-3 py-2.5 text-[12.5px] text-text-primary">
        <span aria-hidden="true">⚠️</span>
        <span>
          <span className="font-bold text-amber-ink">Bẫy người Việt:</span> {point.pitfall[0]}
          <b className="text-amber-ink">{point.pitfall[1]}</b>
          {point.pitfall[2]}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-2.5">
        <span className="text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">VÍ DỤ NGỮ CẢNH</span>
        {point.ex.map((e, i) => (
          <div key={e.hz} className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1">
            <div>
              <div className="zh text-[19px] leading-[1.6] text-text-primary">{e.hz}</div>
              <div className="text-[12.5px] text-text-secondary">{e.py}</div>
              <div className="text-[13px] text-text-primary">{e.vi}</div>
            </div>
            <button
              type="button"
              aria-label={`Nghe phát âm câu ${i + 1}`}
              onClick={() => playExample(e.hz)}
              className="grid h-10 w-10 place-items-center self-center rounded-full border border-border-subtle bg-surface-elevated text-base text-[color:var(--hz-jade-ink,#144d38)] hover:border-learning-mastered hover:bg-jade-wash"
            >
              🔊
            </button>
          </div>
        ))}
      </div>

      <Link
        href="/review"
        className="mt-0.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[11px] border border-border-subtle bg-surface-muted px-4 text-[12.5px] font-bold text-text-primary hover:border-border-strong"
      >
        Luyện tập cấu trúc này
      </Link>
    </article>
  );
}
