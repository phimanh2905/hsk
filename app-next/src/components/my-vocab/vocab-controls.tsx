"use client";

/* Controls — port .controls/.seg/.newdeck + search của mock (search page-local:
   topbar app là ⌘K palette). Seg inline active = accent-soft (khớp mock). */
import type { Ref } from "react";
import { Search } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function VocabSeg<K extends string>({
  label, options, value, onChange, className,
}: {
  label: string;
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (k: K) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-border-default bg-surface-muted p-[3px] [scrollbar-width:none]",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className={cn(
            "min-h-9 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold transition-colors",
            o.key === value
              ? "border-action-primary/35 bg-rose-wash text-action-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const VIEW_OPTS = [
  { key: "decks" as const, label: "Bộ thẻ cá nhân (Decks)" },
  { key: "list" as const, label: "Danh sách toàn bộ từ" },
];
const HSK_OPTS = [
  { key: "all", label: "Tất cả" },
  { key: "HSK 1", label: "HSK 1" }, { key: "HSK 2", label: "HSK 2" }, { key: "HSK 3", label: "HSK 3" },
  { key: "HSK 4", label: "HSK 4" }, { key: "HSK 5", label: "HSK 5" }, { key: "HSK 6", label: "HSK 6" },
  { key: "star", label: "Đã lưu" },
];

export function VocabControls({ view, onView, hsk, onHsk, q, onQ, onNewDeck, searchRef }: {
  view: "decks" | "list";
  onView: (v: "decks" | "list") => void;
  hsk: string;
  onHsk: (h: string) => void;
  q: string;
  onQ: (v: string) => void;
  onNewDeck: () => void;
  searchRef?: Ref<HTMLInputElement>;
}) {
  return (
    <section data-od-id="vocab-controls" aria-label="Chế độ xem và bộ lọc" className="flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-elevated/80 px-4 py-3.5 shadow-xs backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <VocabSeg label="Chế độ xem" options={VIEW_OPTS} value={view} onChange={onView} />
        <button
          type="button"
          data-od-id="new-deck"
          onClick={onNewDeck}
          className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-transparent px-4 text-[13px] font-bold text-text-secondary hover:border-action-primary hover:text-action-primary"
        >
          + Tạo Deck mới
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="min-w-[74px] text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">CẤP ĐỘ</span>
        <VocabSeg label="Lọc HSK" options={HSK_OPTS} value={hsk} onChange={onHsk} />
      </div>
      <label className="flex h-10 min-w-[200px] flex-[0_1_280px] items-center gap-2 rounded-full border border-border-subtle bg-surface-muted pl-3.5 pr-3">
        <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
        <input
          ref={searchRef}
          type="search"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Tìm kiếm từ vựng…"
          aria-label="Tìm kiếm từ vựng"
          className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
        />
        <kbd className="rounded-[5px] border border-border-subtle bg-surface-elevated px-[7px] py-px text-[11px] text-text-secondary">/</kbd>
      </label>
    </section>
  );
}
