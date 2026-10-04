"use client";

/* Topbar roadmap (port .topbar của opendesign_hsk/roadmap.html):
   back-link + level switcher + head-progress. Theme toggle thuộc shell toàn
   cục nên KHÔNG port (spec §6). Sticky + backdrop-blur như mock. */
import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icon";
import { LevelSwitcher } from "./level-switcher";
import type { LevelId } from "@/content/roadmap-stations";

export function RoadmapTopbar({
  levels,
  value,
  onLevelChange,
  pct,
}: {
  levels: ReadonlyArray<{ id: LevelId; label: string }>;
  value: LevelId;
  onLevelChange: (id: LevelId) => void;
  pct: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-paper/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2.5 px-6 py-2.5 max-[640px]:px-4">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-control border border-border-default bg-surface-elevated py-1 pl-2.5 pr-3.5 text-[13px] font-bold hover:border-border-strong"
        >
          <ArrowLeft size={15} strokeWidth={2.4} aria-hidden="true" />
          Home
        </Link>
        <LevelSwitcher
          className="mx-auto max-[640px]:order-last max-[640px]:w-full"
          levels={levels}
          value={value}
          onChange={onLevelChange}
        />
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-text-secondary" aria-label={`Tiến độ ${pct}%`}>
          <span>{pct}%</span>
          <span className="h-1.5 w-[90px] overflow-hidden rounded-full bg-ring-track">
            <span className="block h-full rounded-full bg-jade transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>
    </header>
  );
}
