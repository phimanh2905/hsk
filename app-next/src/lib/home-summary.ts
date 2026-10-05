"use client";

/* Nguồn data Home Dashboard mới (spec 2026-10-04): gom mọi số trên trang chủ
   vào 1 lần đọc progressStore thay vì mỗi component tự đọc rải rác.
   Thuần + try/catch defaults như progressStore (Review Focus #1, #2). */

import { useEffect, useState } from "react";
import { courses } from "@/content/courses";
import { vocab } from "@/content/vocab";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";

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

/* Bài vocab CHƯA done kế tiếp cùng book (port logic ContinueCard B1). */
function findNextLesson(): HomeLesson | null {
  try {
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
      const title = vocab[book]?.[nextLesson.pageId]?.title ?? nextLesson.title;
      const pct = vocabPages.length > 0 ? Math.round(((vocabPages.length - vocabPages.filter((p) => !donePages.has(p.pageId)).length) / vocabPages.length) * 100) : 0;
      return { book, pageId: nextLesson.pageId, title, pct };
    }
    return null;
  } catch {
    return null;
  }
}

function countVocabTotal(): number {
  try {
    let n = 0;
    // Shape thật của @/content/vocab: Record<book, Record<pageId, VocabLesson>> với `words` (không phải `rows` như brief giả định).
    for (const pages of Object.values(vocab)) {
      for (const page of Object.values(pages as Record<string, { words?: unknown[] }>)) {
        n += Array.isArray(page?.words) ? page.words.length : 0;
      }
    }
    return n;
  } catch {
    return 0;
  }
}

function isDue(it: SrsItem): boolean {
  return it.status !== "known" && it.dueAt != null && it.dueAt <= Date.now();
}

export function readHomeSummary(): HomeSummary {
  let srs: SrsItem[] = [];
  try {
    srs = progressStore.getAllSrs();
  } catch {
    srs = [];
  }
  const reviewed = srs.filter((it) => it.reviewCount > 0);
  const good = reviewed.filter((it) => it.status === "learned" || it.status === "known");
  return {
    lesson: findNextLesson(),
    srsDue: srs.filter(isDue).length,
    srsTotal: srs.length,
    recallPct: reviewed.length > 0 ? Math.round((good.length / reviewed.length) * 100) : 0,
    streak: progressStore.getStreak(),
    todayXp: progressStore.getToday(),
    lessonsDone: progressStore.listPageDone().length,
    lessonsTotal: Object.values(courses).reduce((n, c) => n + c.pages.length, 0),
    vocabMastered: srs.filter((it) => it.status === "learned" || it.status === "known").length,
    vocabTotal: countVocabTotal(),
  };
}

const EMPTY: HomeSummary = {
  lesson: null, srsDue: 0, srsTotal: 0, recallPct: 0, streak: 0, todayXp: 0,
  lessonsDone: 0, lessonsTotal: 0, vocabMastered: 0, vocabTotal: 0,
};

/* mounted=false trước effect → component return null khi SSR (Review Focus #3). */
export function useHomeSummary(): HomeSummary & { mounted: boolean } {
  const [s, setS] = useState<HomeSummary>(EMPTY);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => setS(readHomeSummary());
    sync();
    setMounted(true);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);
  return { ...s, mounted };
}
