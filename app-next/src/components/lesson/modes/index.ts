"use client";

/* Mode registry — thay window.NHAI.lessonModes của clone/js/lesson.js.
   Task 12–17 sẽ thay từng placeholder component. */

import type { ComponentType } from "react";
import type { LessonMode } from "../lesson-provider";
import FlashcardMode from "./flashcard";
import QuizMode from "./quiz";
import TypingMode from "./typing";
import ReadingMode from "./reading";
import ListenMode from "./listen";
import DanceMode from "./dance";
import BattleMode from "./battle";

export const modeRegistry: Record<LessonMode, ComponentType> = {
  flash: FlashcardMode,
  quiz: QuizMode,
  typing: TypingMode,
  reading: ReadingMode,
  listen: ListenMode,
  dance: DanceMode,
  battle: BattleMode,
};

export const modeLabels: Record<LessonMode, { name: string; badge: string }> = {
  flash: { name: "Flashcard", badge: "" },
  quiz: { name: "Trắc nghiệm", badge: "" },
  typing: { name: "Gõ từ", badge: "" },
  reading: { name: "Đọc hiểu", badge: "" },
  listen: { name: "Nghe ghép câu", badge: "" },
  dance: { name: "Hanzi Dance", badge: "Chưa học" },
  battle: { name: "Đấu trí", badge: "Xếp hạng" },
};

export const modeOrder: LessonMode[] = ["flash", "quiz", "typing", "reading", "listen", "dance", "battle"];
