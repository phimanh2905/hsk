"use client";

/* Hanzi Studio — radical-first redesign (mock 2026-10-07).
   Root sở hữu state (catalogMode/stroke/cat/level/q/cur/mode/pane/page);
   catalog + workbench presentational. Deep-link ?rad=X chọn bộ thủ lúc mount
   (đọc window.location.search trực tiếp — không dùng useSearchParams để giữ SSG). */
import { useEffect, useRef, useState } from "react";
import { Search } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { hanziChars } from "@/content/hanzi";
import {
  PAGE_SIZE,
  STROKE_FILTERS,
  CAT_FILTERS,
  HSK_TABS,
  filterRadicals,
  filterChars,
  radicalOf,
  radicalOfChar,
  charOf,
  type CatalogMode,
  type StrokeFilter,
  type CatFilter,
  type HskLevel,
  type StudioSelection,
} from "@/components/hanzi/studio/studio-model";
import { SegControl } from "@/components/hanzi/studio/seg-control";
import { StudioCatalog } from "@/components/hanzi/studio/studio-catalog";
import { StudioWorkbench } from "@/components/hanzi/studio/studio-workbench";
import type { StudioGridApi } from "@/components/hanzi/studio/studio-grid";
import type { WorkbenchData } from "@/components/hanzi/studio/studio-workbench";
import { cn } from "@/lib/cn";

const HSK_PAGE_SIZE = 12;

export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, pages));
}

const pillBtn = (active: boolean) =>
  cn(
    "min-h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors",
    active
      ? "border-action-primary bg-rose-wash text-action-primary"
      : "border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary",
  );

export default function HanziStudio() {
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("rad");
  const [stroke, setStroke] = useState<StrokeFilter>("all");
  const [cat, setCat] = useState<CatFilter>("core");
  const [level, setLevel] = useState<HskLevel | "all">("HSK 1");
  const [q, setQ] = useState("");
  const [cur, setCur] = useState<StudioSelection>({ kind: "rad", g: "水" });
  const [mode, setMode] = useState<"watch" | "draw">("watch");
  const [pane, setPane] = useState<"catalog" | "work">("catalog");
  const [page, setPage] = useState(1);
  const apiRef = useRef<StudioGridApi | null>(null);

  /* Deep-link ?rad=X — chạy 1 lần lúc mount (client). */
  useEffect(() => {
    const rad = new URLSearchParams(window.location.search).get("rad");
    if (rad && radicalOf(rad)) {
      setCur({ kind: "rad", g: rad });
      setCatalogMode("rad");
    }
  }, []);

  /* Đổi filter/search/mode/level → về trang 1. */
  useEffect(() => {
    setPage(1);
  }, [stroke, cat, q, catalogMode, level]);

  const rads = filterRadicals({ stroke, cat, q });
  const chars = filterChars({ level, q });

  const isRadMode = catalogMode === "rad";
  const pageSize = isRadMode ? PAGE_SIZE : HSK_PAGE_SIZE;
  const list = isRadMode ? rads : chars;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = clampPage(page, pages);
  const pagedRads = rads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedChars = chars.slice((safePage - 1) * HSK_PAGE_SIZE, safePage * HSK_PAGE_SIZE);

  const totalLabel = isRadMode
    ? `${rads.length} bộ thủ · ${pages} trang`
    : `${chars.length} chữ HSK${level === "all" ? "" : " · " + level}`;

  const hasStrokeData = (sel: StudioSelection): boolean =>
    sel.kind === "rad" ? radicalOf(sel.g)?.strokeChar != null : !!charOf(sel.g);

  const radForChar = (ch: string) => radicalOfChar(ch);

  /* Data cho workbench; null → panel fallback "chưa có data nét". */
  const wbData: WorkbenchData | null = (() => {
    if (cur.kind === "rad") {
      const rad = radicalOf(cur.g);
      return rad ? { kind: "rad", rad } : null;
    }
    const meta = charOf(cur.g);
    const rad = radForChar(cur.g);
    return meta && rad ? { kind: "char", meta, rad, meaning: hanziChars[cur.g]?.meaning } : null;
  })();

  const focusWorkAndPlay = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setPane("work"); // mock select()
    requestAnimationFrame(() => apiRef.current?.play()); // mock: chọn chữ → playAll (watch)
  };

  const select = (sel: StudioSelection) => {
    setCur(sel);
    focusWorkAndPlay();
  };

  const onSelectTray = (ch: string) => {
    setCur({ kind: "char", g: ch });
    focusWorkAndPlay();
  };

  const changeCatalogMode = (m: CatalogMode) => {
    setCatalogMode(m);
    setPage(1);
  };

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
        className="flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-3.5 py-3 shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {isRadMode && (
            <>
              <span className="text-[12.5px] font-bold text-text-secondary">Số nét</span>
              <SegmentedTabs
                label="Lọc số nét"
                tabs={STROKE_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
                value={stroke}
                onChange={setStroke}
                className="max-w-full overflow-x-auto"
              />
            </>
          )}
          <label className={cn("flex h-10 min-w-[200px] items-center gap-2 rounded-full border border-border-subtle bg-surface-muted px-3.5", isRadMode && "ml-auto")}>
            <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isRadMode ? "Tìm bộ thủ, nghĩa…" : "Tìm chữ, pinyin…"}
              aria-label="Tìm bộ thủ"
              className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
            />
          </label>
        </div>

        {isRadMode ? (
          <div role="group" aria-label="Phân loại bộ thủ" className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-bold text-text-secondary">Phân loại</span>
            {CAT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={cat === f.key}
                onClick={() => setCat(f.key)}
                className={pillBtn(cat === f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[12.5px] font-bold text-text-secondary">Cấp độ</span>
            <SegmentedTabs
              label="Lọc cấp độ HSK"
              tabs={HSK_TABS.map((t) => ({ key: t.key, label: t.label }))}
              value={level}
              onChange={setLevel}
              className="max-w-full overflow-x-auto"
            />
          </div>
        )}
      </div>

      <SegControl
        label="Chuyển khung"
        tabs={[
          { key: "catalog" as const, label: "Kho tra cứu" },
          { key: "work" as const, label: "Bàn tập viết" },
        ]}
        value={pane}
        onChange={setPane}
        className="sticky top-16 z-[15] lg:hidden"
      />

      <div className="grid items-start gap-4 lg:grid-cols-[42fr_58fr]">
        <div className={cn(pane !== "catalog" && "hidden lg:block")}>
          <StudioCatalog
            mode={catalogMode}
            rads={pagedRads}
            chars={pagedChars}
            totalLabel={totalLabel}
            page={safePage}
            pages={pages}
            cur={cur.g}
            onSelect={select}
            onPage={setPage}
            onModeChange={changeCatalogMode}
          />
        </div>
        <div className={cn(pane !== "work" && "hidden lg:block")}>
          <StudioWorkbench
            data={wbData}
            mode={mode}
            onMode={setMode}
            apiRef={apiRef}
            hasStrokeData={hasStrokeData(cur)}
            onSelectTray={onSelectTray}
          />
        </div>
      </div>
    </div>
  );
}
