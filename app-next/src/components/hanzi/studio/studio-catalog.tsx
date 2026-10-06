"use client";

/* Panel "Kho Hán tự" — port #paneCatalog (.zcard/.zbadge/.spill/.pager) của
   opendesign_hsk/hanzi.html. Presentational: data đã lọc + phân trang từ root. */
import { Check } from "@/components/ui/icon";
import type { StudioChar, StudioLevel } from "@/content/hanzi-studio";
import { cn } from "@/lib/cn";

const SPILL_LABEL = { done: "Đã thuộc", mid: "Đang luyện", new: "Mới" } as const;

const SPILL_CLASS = {
  done: "text-learning-mastered border-learning-mastered",
  mid: "text-learning-progress border-learning-progress/45 bg-amber-wash",
  new: "text-text-secondary border-border-subtle bg-surface-muted",
} as const;

function ZBadge({ st }: { st: StudioChar["st"] }) {
  if (st === "done") {
    return (
      <span aria-hidden="true" className="absolute right-[7px] top-[7px] grid h-[18px] w-[18px] place-items-center rounded-full bg-learning-mastered text-white">
        <Check size={11} strokeWidth={3.4} />
      </span>
    );
  }
  if (st === "mid") {
    return <span aria-hidden="true" className="absolute right-[7px] top-[7px] h-[18px] w-[18px] rounded-full bg-learning-progress" />;
  }
  return <span aria-hidden="true" className="absolute right-[7px] top-[7px] h-[18px] w-[18px] rounded-full border-[1.5px] border-dashed border-border-strong" />;
}

const PAGER_BTN =
  "min-h-10 min-w-10 rounded-[10px] border border-border-subtle bg-surface-elevated font-extrabold text-text-primary disabled:opacity-40";

export function StudioCatalog({
  chars, total, page, pages, level, cur, onSelect, onPage,
}: {
  chars: StudioChar[];
  total: number;
  page: number;
  pages: number;
  level: StudioLevel;
  cur: string;
  onSelect: (ch: string) => void;
  onPage: (p: number) => void;
}) {
  return (
    <section
      aria-label="Kho Hán tự"
      data-od-id="char-catalog"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2.5">
        <h2 className="text-[14.5px] font-bold">Kho Hán tự</h2>
        <span className="text-xs text-text-secondary" data-testid="cat-count">
          {total} chữ mẫu{level === "all" ? "" : " · " + level}
        </span>
      </div>

      <div className="max-h-[680px] overflow-y-auto pr-2 [scrollbar-width:thin]">
        {chars.length === 0 ? (
          <p className="py-5 text-center text-[13px] text-text-secondary">
            Không có chữ nào khớp bộ lọc.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 min-[1400px]:grid-cols-4">
            {chars.map((c) => (
              <button
                key={c.ch}
                type="button"
                data-od-id={`zcard-${c.ch}`}
                aria-pressed={c.ch === cur}
                onClick={() => onSelect(c.ch)}
                className={cn(
                  "relative flex min-h-32 w-full flex-col items-center justify-center gap-0.5 rounded-[14px] border bg-surface-muted px-2 pb-2.5 pt-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                  c.ch === cur
                    ? "border-2 border-action-primary bg-rose-wash px-[7px] pb-[9px] pt-[11px] shadow-xs"
                    : "border-border-subtle",
                )}
              >
                <ZBadge st={c.st} />
                <span className="zh text-4xl leading-[1.3] text-text-primary">{c.ch}</span>
                <span className="text-xs text-text-secondary">{c.py} · {c.n} nét</span>
                <span className={cn("whitespace-nowrap rounded-full border px-2.5 py-px text-[10.5px] font-extrabold", SPILL_CLASS[c.st])}>
                  {SPILL_LABEL[c.st]}
                </span>
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
        <span data-testid="pager-label">Trang {page} / {pages} · {total} chữ mẫu</span>
        <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)} className={PAGER_BTN}>
          ▶
        </button>
      </div>
    </section>
  );
}
