// app-next/src/components/my-grammar/grammar-filters.tsx
"use client";

/* Filters — port .filters/.chip/.btn-add của mock + search page-local (my-vocab precedent). */
import type { Ref } from "react";
import { Search } from "@/components/ui/icon";
import { GRAMMAR_LEVELS, GRAMMAR_TOPICS } from "@/content/grammar-points";
import { cn } from "@/lib/cn";

export function GrammarChip({
  pressed, onClick, children, className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-10 whitespace-nowrap rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
        pressed
          ? "border-action-primary text-action-primary ring-3 ring-action-primary/15"
          : "border-border-subtle bg-surface-elevated text-text-secondary hover:border-border-strong hover:text-text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GrammarFilters({
  level, onLevel, topic, onTopic, q, onQ, onAdd, result, searchRef,
}: {
  level: string;
  onLevel: (l: string) => void;
  topic: string;
  onTopic: (t: string) => void;
  q: string;
  onQ: (v: string) => void;
  onAdd: () => void;
  result: string;
  searchRef?: Ref<HTMLInputElement>;
}) {
  return (
    <section data-od-id="grammar-filters" aria-label="Bộ lọc ngữ pháp" className="flex flex-col gap-2.5">
      <div role="group" aria-label="Lọc theo cấp độ HSK" data-od-id="level-ribbon" className="flex flex-wrap items-center gap-2">
        <span className="min-w-[64px] text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">Cấp độ</span>
        {GRAMMAR_LEVELS.map((l) => (
          <GrammarChip key={l} pressed={level === l} onClick={() => onLevel(l)}>{l === "all" ? "Tất cả" : l}</GrammarChip>
        ))}
        <button
          type="button"
          data-od-id="add-grammar"
          onClick={onAdd}
          className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-4 text-[12.5px] font-bold text-text-primary hover:border-border-strong"
        >
          + Thêm cấu trúc mới
        </button>
      </div>
      <div role="group" aria-label="Lọc theo chủ điểm" data-od-id="topic-ribbon" className="flex flex-wrap items-center gap-2">
        <span className="min-w-[64px] text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">Chủ điểm</span>
        {GRAMMAR_TOPICS.map(([key, label]) => (
          <GrammarChip key={key} pressed={topic === key} onClick={() => onTopic(key)}>
            {/* Label trộn Việt+Hán — .zh chỉ set font-family Hán nên an toàn cho cả chuỗi (Global Constraint: Hán tự luôn kèm class zh) */}
            <span className={/[\u4e00-\u9fff]/.test(label) ? "zh" : undefined}>{label}</span>
          </GrammarChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-[12.5px] text-text-secondary" aria-live="polite" data-testid="result-line">{result}</p>
        <label className="ml-auto flex h-11 min-w-[200px] flex-[0_1_280px] items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated pl-3.5 pr-2">
          <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Tìm kiếm cấu trúc, ví dụ..."
            aria-label="Tìm kiếm cấu trúc ngữ pháp"
            className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
          />
          <kbd className="rounded-md border border-border-subtle bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">/</kbd>
        </label>
      </div>
    </section>
  );
}
