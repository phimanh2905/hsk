"use client";

import type { RefObject } from "react";

import { READING_CATS, READING_LEVELS, type ReadingCat, type ReadingLevel } from "@/content/reading";
import type { ReadingFilter } from "@/lib/reading/library";
import { cn } from "@/lib/cn";
import { ICON_STROKE, Search, Star } from "@/components/ui/icon";
import { Chip } from "@/components/ui/chip";

/* Bộ lọc thư viện — port mood từ opendesign_hsk/reading.html .frow/.flabel.
   Thuần presentational; searchRef do root giữ để phím tắt "/" focus. */
export function ReadingFilters({
  filter,
  onChange,
  count,
  searchRef,
}: {
  filter: ReadingFilter;
  onChange: (f: ReadingFilter) => void;
  count: number;
  searchRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <section
      data-od-id="reading-filters"
      aria-label="Bộ lọc bài đọc"
      className="flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cấp độ HSK">
        <span className="text-xs font-bold text-text-secondary">Cấp độ</span>
        <Chip
          selected={filter.level === "all"}
          aria-pressed={filter.level === "all"}
          onClick={() => onChange({ ...filter, level: "all" })}
        >
          Tất cả
        </Chip>
        {READING_LEVELS.map((lv: ReadingLevel) => (
          <Chip
            key={lv}
            selected={filter.level === lv}
            aria-pressed={filter.level === lv}
            onClick={() => onChange({ ...filter, level: lv })}
          >
            {lv}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Thể loại">
        <span className="text-xs font-bold text-text-secondary">Thể loại</span>
        <Chip
          selected={filter.cat === "all"}
          aria-pressed={filter.cat === "all"}
          onClick={() => onChange({ ...filter, cat: "all" })}
        >
          Tất cả
        </Chip>
        {READING_CATS.map((c) => (
          <Chip
            key={c.key}
            selected={filter.cat === c.key}
            aria-pressed={filter.cat === c.key}
            onClick={() => onChange({ ...filter, cat: c.key as ReadingCat })}
          >
            {c.label}
          </Chip>
        ))}
        <Chip
          selected={filter.cat === "saved"}
          aria-pressed={filter.cat === "saved"}
          icon={<Star size={14} strokeWidth={ICON_STROKE} />}
          onClick={() => onChange({ ...filter, cat: "saved" })}
        >
          Đã lưu
        </Chip>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative inline-flex min-h-11 flex-1 items-center sm:max-w-xs">
          <Search
            size={16}
            strokeWidth={ICON_STROKE}
            className="pointer-events-none absolute left-3 text-text-secondary"
          />
          <input
            ref={searchRef}
            type="search"
            value={filter.q}
            onChange={(e) => onChange({ ...filter, q: e.target.value })}
            placeholder="Tìm bài đọc…"
            aria-label="Tìm bài đọc"
            className="zh-input min-h-11 w-full rounded-control border border-border-default bg-surface-elevated py-2 pl-9 pr-10 text-sm text-text-primary placeholder:text-text-secondary focus:border-action-primary focus:outline-none focus:ring-3 ring-action-focus ring-offset-2"
          />
          <kbd className="absolute right-3 rounded border border-border-default bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
            /
          </kbd>
        </label>
        <p aria-live="polite" className={cn("text-xs font-bold text-text-secondary")}>
          {count} bài
        </p>
      </div>
    </section>
  );
}

export default ReadingFilters;
