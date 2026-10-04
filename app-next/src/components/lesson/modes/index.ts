"use client";

/* Mode registry — mode flash đã thay bằng FlashStage (flash/flash-stage.tsx, port
   main.stage của opendesign lesson.html) nên không qua registry nữa; 6 mode còn lại giữ nguyên. */

import type { ComponentType } from "react";
import type { LessonMode } from "../lesson-provider";
import QuizMode from "./quiz";
import TypingMode from "./typing";
import ReadingMode from "./reading";
import ListenMode from "./listen";
import DanceMode from "./dance";
import BattleMode from "./battle";

export const modeRegistry: Partial<Record<LessonMode, ComponentType>> = {
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