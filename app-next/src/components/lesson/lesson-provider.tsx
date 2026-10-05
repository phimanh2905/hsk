"use client";

/* LessonProvider (C1) — state machine chế độ học, port clone/js/lesson.js:16-25 (S).
   Bổ sung state flash SRS theo opendesign lesson.html: revealed, autoplay (persist),
   grade 1|2|3 (recordReview vào progress-store) và done (hết bài). */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VocabWord } from "@/content/vocab";
import { progressStore } from "@/lib/store/progress-store";
import type { Grade } from "@/lib/stats/review";
import { useToastSafe } from "@/components/shell/toast-provider";

export type LessonMode = "flash" | "quiz" | "typing" | "reading" | "listen" | "dance" | "battle";

export type LessonItem = VocabWord & { index: number; itemKey: string };

export type KnownFlag = "known" | "unknown";

export type GradeLevel = 1 | 2 | 3;

const AUTOPLAY_KEY = "bye.lesson.autoplay";

const GRADE_TOAST: Record<GradeLevel, string> = {
  1: "Chưa thuộc — ôn lại sau 1 phút",
  2: "Mơ hồ — ôn lại sau 5 phút",
  3: "Đã thuộc — tuyệt vời!",
};

/* 1/2/3 của mockup → Grade của hệ review (applyGrade: forgot 60s · hard 5 phút · good 3/7 ngày) */
const GRADE_LABEL: Record<GradeLevel, Grade> = { 1: "forgot", 2: "hard", 3: "good" };

type LessonCtx = {
  items: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  mode: LessonMode;
  setMode(m: LessonMode): void;
  index: number;
  setIndex(i: number): void;
  known: Record<number, KnownFlag>;
  markKnown(i: number, f: KnownFlag): void;
  revealed: boolean;
  setRevealed(v: boolean): void;
  autoplay: boolean;
  toggleAutoplay(): void;
  grade(level: GradeLevel): void;
  done: boolean;
};

const LessonContext = createContext<LessonCtx | null>(null);

export function useLesson(): LessonCtx {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson phải dùng trong <LessonProvider>");
  return ctx;
}

export function LessonProvider({
  items,
  book,
  page,
  deckName,
  children,
}: {
  items: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<LessonMode>("flash");
  const [index, setIndex] = useState(0);
  const [known, setKnown] = useState<Record<number, KnownFlag>>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const toast = useToastSafe();

  // RULING Task 12: đọc localStorage SAU mount (hydration) — render đầu luôn autoplay=false
  useEffect(() => {
    try {
      setAutoplay(localStorage.getItem(AUTOPLAY_KEY) === "1");
    } catch {
      /* silent */
    }
  }, []);

  // persist autoplay, bỏ qua lần mount đầu (tránh ghi đè giá trị đã lưu)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    try {
      localStorage.setItem(AUTOPLAY_KEY, autoplay ? "1" : "0");
    } catch {
      /* silent */
    }
  }, [autoplay]);

  // RULING Task 12: đổi mode reset index về 0; flash SRS reset luôn revealed/done
  const setModeAndReset = (m: LessonMode) => {
    setMode(m);
    setIndex(0);
    setRevealed(false);
    setDone(false);
  };

  // grade (port grade() của mockup): chỉ khi revealed; hết bài → done
  // done=true là màn hoàn thành: deck đã ẩn nhưng phím 1/2/3 vẫn còn trên window.
  // Không chặn thì bấm Space (setRevealed(true)) + 1/2/3 sẽ recordReview lại chính
  // từ vừa chấm → ghi đè "Đã thuộc" bằng "learning" (sai dữ liệu SRS).
  const grade = (level: GradeLevel) => {
    if (!revealed || done) return;
    const item = items[index];
    if (!item) return;
    // recordReview của review-redesign bỏ qua key chưa có trong SRS — từ học mới
    // trong bài phải được enroll trước (addSrsBatch idempotent) rồi mới chấm.
    if (!progressStore.getSrs(item.itemKey)) progressStore.addSrsBatch([item.itemKey]);
    progressStore.recordReview(item.itemKey, GRADE_LABEL[level]);
    toast(GRADE_TOAST[level]);
    setRevealed(false);
    if (index >= items.length - 1) setDone(true);
    else setIndex(index + 1);
  };

  const toggleAutoplay = () => setAutoplay((v) => !v);

  const value = useMemo<LessonCtx>(
    () => ({
      items,
      book,
      page,
      deckName,
      mode,
      setMode: setModeAndReset,
      index,
      setIndex,
      known,
      markKnown: (i: number, f: KnownFlag) => setKnown((k) => ({ ...k, [i]: f })),
      revealed,
      setRevealed,
      autoplay,
      toggleAutoplay,
      grade,
      done,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, book, page, deckName, mode, index, known, revealed, autoplay, done]
  );

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
