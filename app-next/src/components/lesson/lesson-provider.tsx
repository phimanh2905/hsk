"use client";

/* LessonProvider (C1) — state machine chế độ học, port clone/js/lesson.js:16-25 (S).
   Provider chỉ giữ state; timer/tài nguyên của từng mode do mode component
   tự dọn trong useEffect return (như addCleanup trong clone/js/lesson.js). */

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { VocabWord } from "@/content/vocab";

export type LessonMode = "flash" | "quiz" | "typing" | "reading" | "listen" | "dance" | "battle";

export type LessonItem = VocabWord & { index: number; itemKey: string };

export type KnownFlag = "known" | "unknown";

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

  const value = useMemo<LessonCtx>(
    () => ({
      items,
      book,
      page,
      deckName,
      mode,
      setMode,
      index,
      setIndex,
      known,
      markKnown: (i: number, f: KnownFlag) => setKnown((k) => ({ ...k, [i]: f })),
    }),
    [items, book, page, deckName, mode, index, known]
  );

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
