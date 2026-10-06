"use client";

/* Nguồn data Home Dashboard mới (spec 2026-10-04): gom mọi số trên trang chủ
   vào 1 lần đọc progressStore thay vì mỗi component tự đọc rải rác.
   Thuần + try/catch defaults như progressStore (Review Focus #1, #2). */

import { useEffect, useState } from "react";
import { courses } from "@/content/courses";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";
import { loadVocabMeta } from "@/lib/content/vocab-client";
import type { VocabMeta } from "@/lib/content/vocab";

export type HomeLesson = { book: string; pageId: string; title: string; pct: number };

export type HomeSummary = {
  lesson: HomeLesson | null;
  srsDue: number;
  srsTotal: number;
  recallPct: number;
  streak: number;
  todayXp: number;
  lessonsDone: number;
  lessonsTotal: number;
  vocabMastered: number;
  vocabTotal: number;
};

export const DAILY_GOAL_XP = 20; // mục tiêu mỗi ngày (mock: 20 phút → quy đổi XP)

/* Bài vocab CHƯA done kế tiếp cùng book (port logic ContinueCard B1).
   Title ưu tiên từ vocabMeta (content D1 qua API) — fallback title của courses. */
function findNextLesson(vocabMeta: VocabMeta | null): HomeLesson | null {
  try {
    const titleOf = (book: string, pageId: string): string | undefined =>
      vocabMeta?.find((b) => b.book === book)?.lessons.find((l) => l.pageId === pageId)?.title;
    const done = progressStore.listPageDone();
    if (done.length === 0) return null;
    const byBook = new Map<string, Set<string>>();
    for (const k of done) {
      const idx = k.indexOf("/");
      if (idx <= 0) continue;
      const book = k.slice(0, idx);
      if (!courses[book]) continue;
      if (!byBook.has(book)) byBook.set(book, new Set());
      byBook.get(book)!.add(k.slice(idx + 1));
    }
    for (const [book, donePages] of byBook) {
      const vocabPages = courses[book].pages.filter((p) => p.skill === "vocab");
      const nextLesson = vocabPages.find((p) => !donePages.has(p.pageId));
      if (!nextLesson) continue;
      const title = titleOf(book, nextLesson.pageId) ?? nextLesson.title;
      const pct = vocabPages.length > 0 ? Math.round(((vocabPages.length - vocabPages.filter((p) => !donePages.has(p.pageId)).length) / vocabPages.length) * 100) : 0;
      return { book, pageId: nextLesson.pageId, title, pct };
    }
    return null;
  } catch {
    return null;
  }
}

function countVocabTotal(vocabMeta: VocabMeta | null): number {
  return vocabMeta?.reduce((n, b) => n + b.lessons.reduce((m, l) => m + l.wordCount, 0), 0) ?? 0;
}

function isDue(it: SrsItem): boolean {
  return it.status !== "known" && it.dueAt != null && it.dueAt <= Date.now();
}

export function readHomeSummary(vocabMeta: VocabMeta | null = null): HomeSummary {
  let srs: SrsItem[] = [];
  try {
    srs = progressStore.getAllSrs();
  } catch {
    srs = [];
  }
  const reviewed = srs.filter((it) => it.reviewCount > 0);
  const good = reviewed.filter((it) => it.status === "learned" || it.status === "known");
  return {
    lesson: findNextLesson(vocabMeta),
    srsDue: srs.filter(isDue).length,
    srsTotal: srs.length,
    recallPct: reviewed.length > 0 ? Math.round((good.length / reviewed.length) * 100) : 0,
    streak: progressStore.getStreak(),
    todayXp: progressStore.getToday(),
    lessonsDone: progressStore.listPageDone().length,
    lessonsTotal: Object.values(courses).reduce((n, c) => n + c.pages.length, 0),
    vocabMastered: srs.filter((it) => it.status === "learned" || it.status === "known").length,
    vocabTotal: countVocabTotal(vocabMeta),
  };
}

const EMPTY: HomeSummary = {
  lesson: null, srsDue: 0, srsTotal: 0, recallPct: 0, streak: 0, todayXp: 0,
  lessonsDone: 0, lessonsTotal: 0, vocabMastered: 0, vocabTotal: 0,
};

/* mounted=false trước effect → component return null khi SSR (Review Focus #3).
   vocabMeta nạp 1 lần qua API; đến sau → sync() chạy lại với meta. */
export function useHomeSummary(): HomeSummary & { mounted: boolean } {
  const [s, setS] = useState<HomeSummary>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [vocabMeta, setVocabMeta] = useState<VocabMeta | null>(null);
  useEffect(() => {
    loadVocabMeta()
      .then(setVocabMeta)
      .catch(() => {
        /* giữ null — số liệu vocab hiển thị 0 thay vì lỗi */
      });
  }, []);
  useEffect(() => {
    const sync = () => setS(readHomeSummary(vocabMeta));
    sync();
    setMounted(true);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [vocabMeta]);
  return { ...s, mounted };
}
