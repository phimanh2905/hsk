"use client";

/* useStationVocab — pool từ vựng cho trạm generator (Task 8, spec
   Roadmap Journey v2 §3): fetch tuần tự /api/v1/content/vocab-lesson
   ?book=&page= cho các bài CHƯA có trong cache module-level (Map key
   `${book}.${page}`), concat vocab thành [hanzi, pinyin, meaning][].
   gram luôn rỗng — trạm generator không có ngữ pháp nhúng. */
import { useEffect, useMemo, useState } from "react";
import type { StationPool } from "@/lib/station-quiz";

export type LessonRef = { book: string; page: string };
type WordTuple = [string, string, string];

const vocabCache = new Map<string, WordTuple[]>();

/** Test-only: cache là module-level — reset giữa các test. */
export function resetStationVocabCacheForTests(): void {
  vocabCache.clear();
}

type VocabWordDto = { hanzi: string; pinyin: string; meaning: string };

async function fetchLessonWords(book: string, page: string): Promise<WordTuple[]> {
  const res = await fetch(
    `/api/v1/content/vocab-lesson?book=${encodeURIComponent(book)}&page=${encodeURIComponent(page)}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { lesson?: { words?: VocabWordDto[] } | null };
  return (data.lesson?.words ?? []).map(
    (w) => [w.hanzi, w.pinyin, w.meaning] as WordTuple,
  );
}

export function useStationVocab(
  lessons: readonly LessonRef[],
): { pool: StationPool; loading: boolean } {
  const key = useMemo(
    () => lessons.map((l) => `${l.book}.${l.page}`).join("|"),
    [lessons],
  );
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (lessons.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const l of lessons) {
        const cacheKey = `${l.book}.${l.page}`;
        if (vocabCache.has(cacheKey)) continue; // phiên effect trước đã fetch
        const words = await fetchLessonWords(l.book, l.page);
        if (cancelled) {
          if (words.length > 0) vocabCache.set(cacheKey, words);
          return;
        }
        vocabCache.set(cacheKey, words);
        setVersion((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lessons đổi đồng bộ với key (join)
  }, [key]);

  const pool = useMemo<StationPool>(
    () => ({
      vocab: lessons.flatMap((l) => vocabCache.get(`${l.book}.${l.page}`) ?? []),
      gram: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version bump sau mỗi lần cache
    [key, version],
  );

  /* Tính tại render (không memoize theo key): version bump → re-render →
     đánh giá lại trạng thái cache sau từng fetch. */
  const loading = lessons.some((l) => !vocabCache.has(`${l.book}.${l.page}`));

  return { pool, loading };
}
