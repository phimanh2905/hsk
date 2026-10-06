"use client";

/* Hanzi Studio — port 1:1 opendesign_hsk/hanzi.html (spec 2026-10-05).
   Root sở hữu state (level/state/q/cur/mode/pane/page); catalog + workbench presentational.
   Bỏ topbar của mock (shell đã có streak/theme); toast qua ToastProvider; TTS qua useTts. */
import { useRef, useState } from "react";
import { Search } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { STUDIO_CHARS, STUDIO_LEVELS, type StudioLevel } from "@/content/hanzi-studio";
import { SegControl } from "@/components/hanzi/studio/seg-control";
import { StudioCatalog } from "@/components/hanzi/studio/studio-catalog";
import { StudioWorkbench } from "@/components/hanzi/studio/studio-workbench";
import type { StudioGridApi } from "@/components/hanzi/studio/studio-grid";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 12;
type StateFilter = "all" | "done" | "todo";

// Bỏ dấu (ài → ai) để search "ai" khớp "ài" — giống mock
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, pages));
}

const LEVEL_TABS = STUDIO_LEVELS.map((lv) => ({ key: lv, label: lv === "all" ? "Tất cả" : lv }));
const STATE_PILLS: { key: StateFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "done", label: "Đã thuộc nét" },
  { key: "todo", label: "Cần luyện lại" },
];

export default function HanziStudio() {
  const [level, setLevel] = useState<StudioLevel>("HSK 2"); // mock mở ở HSK 2
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [q, setQ] = useState("");
  const [cur, setCur] = useState("爱");
  const [mode, setMode] = useState<"watch" | "draw">("watch");
  const [pane, setPane] = useState<"catalog" | "work">("catalog");
  const [page, setPage] = useState(1);
  const apiRef = useRef<StudioGridApi>(null);

  const byLevel = STUDIO_CHARS.filter((c) => level === "all" || c.hsk === level);
  const counts: Record<StateFilter, number> = {
    all: byLevel.length,
    done: byLevel.filter((c) => c.st === "done").length,
    todo: byLevel.filter((c) => c.st !== "done").length, // mock lọc st==='todo' (không tồn tại) — port theo nhãn
  };

  const query = fold(q.trim().toLowerCase());
  const filtered = byLevel.filter((c) => {
    if (stateFilter === "done" && c.st !== "done") return false;
    if (stateFilter === "todo" && c.st === "done") return false;
    if (query && !fold(c.ch + c.py + c.hv).toLowerCase().includes(query)) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = clampPage(page, pages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const curChar = STUDIO_CHARS.find((c) => c.ch === cur) ?? STUDIO_CHARS[0];

  const select = (ch: string) => {
    setCur(ch);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setPane("work"); // mock select()
    requestAnimationFrame(() => apiRef.current?.play()); // mock: chọn chữ → playAll (watch)
  };

  const pillBtn = (active: boolean) =>
    cn(
      "min-h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors",
      active
        ? "border-action-primary bg-rose-wash text-action-primary"
        : "border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary",
    );

  return (
    <div className="flex flex-col gap-4">
      <header data-od-id="studio-header">
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">汉字工坊</span> · Hanzi Studio
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Khám phá kết cấu, thứ tự nét và rèn luyện trí nhớ cơ bắp
        </p>
      </header>

      <div
        data-od-id="studio-filters"
        className="flex flex-wrap items-center gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-3.5 py-3 shadow-xs"
      >
        <SegmentedTabs
          label="Lọc cấp độ"
          tabs={LEVEL_TABS}
          value={level}
          onChange={setLevel}
          className="max-w-full overflow-x-auto"
        />
        <label className="ml-auto flex h-10 min-w-[200px] items-center gap-2 rounded-full border border-border-subtle bg-surface-muted px-3.5">
          <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lọc chữ, pinyin, Hán-Việt…"
            aria-label="Lọc chữ Hán"
            className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
          />
        </label>
      </div>

      <div role="group" aria-label="Lọc trạng thái" data-od-id="state-pills" className="flex flex-wrap gap-2">
        {STATE_PILLS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={stateFilter === p.key}
            onClick={() => setStateFilter(p.key)}
            className={pillBtn(stateFilter === p.key)}
          >
            {p.label} ({counts[p.key]})
          </button>
        ))}
      </div>

      <SegControl
        label="Chuyển khung"
        tabs={[
          { key: "catalog" as const, label: "Danh sách chữ" },
          { key: "work" as const, label: "Bàn luyện viết" },
        ]}
        value={pane}
        onChange={setPane}
        className="sticky top-16 z-[15] lg:hidden"
      />

      <div className="grid items-start gap-4 lg:grid-cols-[5fr_7fr]">
        <div className={cn(pane !== "catalog" && "hidden lg:block")}>
          <StudioCatalog
            chars={paged}
            total={filtered.length}
            page={safePage}
            pages={pages}
            level={level}
            cur={cur}
            onSelect={select}
            onPage={setPage}
          />
        </div>
        <div className={cn(pane !== "work" && "hidden lg:block")}>
          <StudioWorkbench char={curChar} mode={mode} onMode={setMode} apiRef={apiRef} />
        </div>
      </div>
    </div>
  );
}
