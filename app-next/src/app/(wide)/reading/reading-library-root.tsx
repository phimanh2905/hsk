"use client";

import { useEffect, useRef, useState } from "react";

import { filterLib, ctaFor, noteFor, type ReadingFilter, type ReadingProgress } from "@/lib/reading/library";
import { listArticles, recommendedId } from "@/lib/reading/repository";
import { progressStore } from "@/lib/store/progress-store";
import { useKeyboard } from "@/lib/use-keyboard";
import { ReadingHero } from "@/components/reading/reading-hero";
import { ReadingFilters } from "@/components/reading/reading-filters";
import { ReadingCard } from "@/components/reading/reading-card";
import { READING_LIB } from "@/content/reading";

/* Root trang Thư viện bài đọc (/reading) — client. Store progress/saved không
   nằm trong snapshot của useProgress() (chỉ {xp}) nên đọc trực tiếp
   progressStore sau mount + re-read khi event "bye:progress" (guard hydration:
   render đầu = trạng thái rỗng, khớp server). */
const PROGRESS_EVENT = "bye:progress";

export function ReadingLibraryRoot() {
  const [filter, setFilter] = useState<ReadingFilter>({ level: "all", cat: "all", q: "" });
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [prog, setProg] = useState<Record<string, ReadingProgress>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const sync = () => {
      setSavedIds(progressStore.getReadingSavedIds());
      const next: Record<string, ReadingProgress> = {};
      for (const item of READING_LIB) {
        const p = progressStore.getReadingProgress(item.id);
        if (p) next[item.id] = p;
      }
      setProg(next);
    };
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    return () => window.removeEventListener(PROGRESS_EVENT, sync);
  }, []);

  useKeyboard({
    "/": (e) => {
      e.preventDefault();
      searchRef.current?.focus();
    },
  });

  const lib = listArticles();

  /* Hero: bài gợi ý + pct/cta theo progress của chính nó. */
  const recId = recommendedId(savedIds, prog);
  const recItem = lib.find((i) => i.id === recId) ?? lib[0];
  const recProg = prog[recItem.id] ?? null;
  const recPct = recProg?.pct ?? 0;

  const filtered = filterLib(lib, filter, savedIds);

  return (
    <div data-od-id="reading-library" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-4 md:p-6">
      <ReadingHero item={recItem} pct={recPct} cta={ctaFor(recProg)} />

      <ReadingFilters filter={filter} onChange={setFilter} count={filtered.length} searchRef={searchRef} />

      {filtered.length > 0 ? (
        <div
          data-od-id="reading-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((item) => {
            const p = prog[item.id] ?? null;
            return (
              <ReadingCard
                key={item.id}
                item={item}
                pct={p?.pct ?? 0}
                saved={savedIds.includes(item.id)}
                note={noteFor(item, p)}
                cta={ctaFor(p)}
                onToggleSave={(id) => progressStore.toggleReadingSaved(id)}
              />
            );
          })}
        </div>
      ) : (
        <div
          data-od-id="reading-empty"
          className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-default bg-surface-muted p-10 text-center"
        >
          <p className="text-sm font-semibold text-text-secondary">
            Không tìm thấy bài đọc nào khớp bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => setFilter({ level: "all", cat: "all", q: "" })}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-default bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:border-action-primary hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            Xoá bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}

export default ReadingLibraryRoot;
