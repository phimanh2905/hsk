"use client";

/* Panel "Kho tra cứu" — radical-first catalog (mock mới 2026-10-07).
   Presentational: data đã lọc + phân trang từ root. KHÔNG badge tiến độ/spill
   trên card — mock mới bỏ hết. Card không có strokeChar vẫn bấm được
   (workbench hiện fallback "chưa có data nét" — xử lý ở Task 8). */
import { BookOpen, Puzzle } from "@/components/ui/icon";
import type { StudioRadical, StudioCharMeta } from "@/content/hanzi-studio/radical-index";
import { cn } from "@/lib/cn";

const PAGER_BTN =
  "min-h-10 min-w-10 rounded-[10px] border border-border-subtle bg-surface-elevated font-extrabold text-text-primary disabled:opacity-40";

const CARD_BASE =
  "flex min-h-[92px] w-full flex-col items-center justify-center gap-0.5 rounded-[14px] border bg-surface-muted px-2 pb-2.5 pt-2.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md";

const CARD_ACTIVE = "border-2 border-action-primary bg-rose-wash px-[7px] pb-[9px] pt-[9px] shadow-xs";

function ModeSwitch({
  mode,
  onSwitch,
}: {
  mode: "rad" | "hsk";
  onSwitch: (m: "rad" | "hsk") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chế độ tra cứu"
      data-od-id="catalog-mode"
      className="flex gap-0.5 rounded-xl border border-border-default bg-surface-muted p-[3px]"
    >
      <button
        type="button"
        aria-pressed={mode === "hsk"}
        onClick={() => onSwitch("hsk")}
        className={cn(
          "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-bold transition-colors",
          mode === "hsk"
            ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
            : "border border-transparent text-text-secondary hover:text-text-primary",
        )}
      >
        <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
        Theo cấp độ HSK
      </button>
      <button
        type="button"
        aria-pressed={mode === "rad"}
        onClick={() => onSwitch("rad")}
        className={cn(
          "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-bold transition-colors",
          mode === "rad"
            ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
            : "border border-transparent text-text-secondary hover:text-text-primary",
        )}
      >
        <Puzzle size={14} strokeWidth={1.8} aria-hidden="true" />
        214 Bộ thủ
      </button>
    </div>
  );
}

export function StudioCatalog({
  mode, rads, chars, totalLabel, page, pages, cur, onSelect, onPage, onModeChange,
}: {
  mode: "rad" | "hsk";
  rads: StudioRadical[];
  chars: StudioCharMeta[];
  totalLabel: string;
  page: number;
  pages: number;
  cur: string;
  onSelect: (sel: { kind: "rad" | "char"; g: string }) => void;
  onPage: (p: number) => void;
  /* Task 9: page gọi setCatalogMode + setPage(1) khi đổi mode. */
  onModeChange?: (m: "rad" | "hsk") => void;
}) {
  return (
    <section
      aria-label="Kho tra cứu"
      data-od-id="char-catalog"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2.5">
        <h2 className="text-[14.5px] font-bold">Kho tra cứu</h2>
        <span className="text-xs text-text-secondary" data-testid="cat-count">
          {totalLabel}
        </span>
      </div>

      <div className="mb-3">
        <ModeSwitch
          mode={mode}
          onSwitch={(m) => {
            if (m !== mode) onModeChange?.(m);
          }}
        />
      </div>

      <div className="max-h-[560px] overflow-y-auto pr-2 [scrollbar-width:thin]">
        {mode === "rad" ? (
          rads.length === 0 ? (
            <p className="py-5 text-center text-[13px] text-text-secondary">
              Không có bộ thủ nào khớp.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 max-[480px]:grid-cols-3">
              {rads.map((r) => (
                <button
                  key={r.char}
                  type="button"
                  data-od-id={`rad-${r.char}`}
                  aria-pressed={r.char === cur}
                  onClick={() => onSelect({ kind: "rad", g: r.char })}
                  className={cn(CARD_BASE, r.char === cur ? CARD_ACTIVE : "border-border-subtle")}
                >
                  <span className="zh text-[34px] leading-[1.25] text-text-primary">{r.char}</span>
                  <span className="text-[11px] font-bold text-text-secondary">{r.hanViet}</span>
                  <span className="whitespace-nowrap text-[10.5px] text-text-secondary">
                    {r.chars.length} chữ
                  </span>
                </button>
              ))}
            </div>
          )
        ) : chars.length === 0 ? (
          <p className="py-5 text-center text-[13px] text-text-secondary">
            Không có chữ nào khớp.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 max-[480px]:grid-cols-3">
            {chars.map((c) => (
              <button
                key={c.ch}
                type="button"
                data-od-id={`zcard-${c.ch}`}
                aria-pressed={c.ch === cur}
                onClick={() => onSelect({ kind: "char", g: c.ch })}
                className={cn(CARD_BASE, c.ch === cur ? CARD_ACTIVE : "border-border-subtle")}
              >
                <span className="zh text-[34px] leading-[1.25] text-text-primary">{c.ch}</span>
                <span className="text-[11px] font-bold text-text-secondary">{c.py}</span>
                <span className="whitespace-nowrap text-[10.5px] text-text-secondary">{c.level}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        data-od-id="catalog-pager"
        className="mt-3 flex items-center justify-center gap-3 text-[12.5px] font-bold text-text-secondary"
      >
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)} className={PAGER_BTN}>
          ◀
        </button>
        <span data-testid="pager-label">Trang {page} / {pages}</span>
        <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)} className={PAGER_BTN}>
          ▶
        </button>
      </div>
    </section>
  );
}
