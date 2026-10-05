"use client";

/* Sổ tay ngữ pháp root — port 1:1 opendesign_hsk/my-grammar.html (spec 2026-10-05).
   Content tĩnh GRAMMAR_POINTS + saved qua bye.grammarMeta. Default level "HSK 4" đúng mock.
   Keyboard "/" focus search. Toast demo cho add/menu đúng copy mock. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GRAMMAR_POINTS, GRAMMAR_TOPICS } from "@/content/grammar-points";
import { filterPoints, grammarHero } from "@/lib/my-grammar";
import { progressStore } from "@/lib/store/progress-store";
import { useKeyboard } from "@/lib/use-keyboard";
import { useToastSafe } from "@/components/shell/toast-provider";
import { GrammarHero } from "./grammar-hero";
import { GrammarFilters } from "./grammar-filters";
import { GrammarCard } from "./grammar-card";

export default function MyGrammarRoot() {
  const router = useRouter();
  const toast = useToastSafe();
  const [mounted, setMounted] = useState(false);
  const [level, setLevel] = useState("HSK 4"); // mock mở ở HSK 4
  const [topic, setTopic] = useState<string>("all");
  const [q, setQ] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setSavedIds(
      Object.entries(progressStore.getGrammarMeta())
        .filter(([, m]) => m.saved)
        .map(([id]) => id),
    );
  }, []);

  /* sync khi toggle phát bye:progress */
  useEffect(() => {
    const refresh = () =>
      setSavedIds(
        Object.entries(progressStore.getGrammarMeta())
          .filter(([, m]) => m.saved)
          .map(([id]) => id),
      );
    window.addEventListener("bye:progress", refresh);
    return () => window.removeEventListener("bye:progress", refresh);
  }, []);

  const filtered = useMemo(
    () => (mounted ? filterPoints(GRAMMAR_POINTS, { level, topic, q }, savedIds) : []),
    [mounted, level, topic, q, savedIds],
  );
  const hero = useMemo(
    () => (mounted ? grammarHero(GRAMMAR_POINTS, savedIds) : { total: 0, savedCount: 0, topLevel: null, topCount: 0 }),
    [mounted, savedIds],
  );

  useKeyboard({
    "/": (e) => { e.preventDefault(); searchRef.current?.focus(); },
  });

  const topicLabel = topic === "all" ? "mọi chủ điểm" : (GRAMMAR_TOPICS.find(([k]) => k === topic)?.[1] ?? topic);

  return (
    <div className="flex flex-col gap-4">
      <GrammarHero
        total={hero.total}
        savedCount={hero.savedCount}
        topLevel={hero.topLevel}
        topCount={hero.topCount}
        onReview={() => router.push("/review")}
      />

      <GrammarFilters
        level={level}
        onLevel={setLevel}
        topic={topic}
        onTopic={setTopic}
        q={q}
        onQ={setQ}
        onAdd={() => toast("Tạo cấu trúc mới: nhập tên + công thức + 1 ví dụ để lưu")}
        result={`${filtered.length} cấu trúc · ${level} · ${topicLabel}`}
        searchRef={searchRef}
      />

      {filtered.length > 0 ? (
        <section data-od-id="grammar-grid" aria-label="Lưới thẻ điểm ngữ pháp" className="grid grid-cols-1 gap-5 min-[901px]:grid-cols-2">
          {filtered.map((p) => (
            <GrammarCard
              key={p.id}
              point={p}
              saved={savedIds.includes(p.id)}
              onToggleSave={(id) => {
                const saved = progressStore.toggleGrammarSaved(id);
                toast(saved ? `Đã lưu ★ ${GRAMMAR_POINTS.find((x) => x.id === id)!.title}` : `Đã bỏ lưu ${GRAMMAR_POINTS.find((x) => x.id === id)!.title}`);
              }}
              onMenu={(id) => toast("Tùy chọn: ghim · ẩn ví dụ · báo lỗi công thức")}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-[20px] border border-border-subtle bg-surface-elevated/85 p-9 text-center text-[13.5px] text-text-secondary shadow-xs">
          Không tìm thấy cấu trúc phù hợp. Thử từ khóa khác hoặc bấm “Tất cả”.
        </div>
      )}
    </div>
  );
}
