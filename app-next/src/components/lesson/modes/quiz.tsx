"use client";

/* Mode Quiz (C3) — trắc nghiệm 4 đáp án pinyin, port clone/js/lesson-quiz.js.
   Toggle đề (Cách đọc/Từ vựng/Ý nghĩa — ẩn phần không chọn, giữ hành vi clone),
   4 nút pinyin (đáp án đúng + 3 nhiễu cùng bài), đúng → +1 XP + toast + sang câu sau 800ms,
   sai → viền đỏ + rung, "Không biết" → sang câu sau không cộng XP, gợi ý phát âm. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLesson, type LessonItem } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CircleCheck, CircleX, PartyPopper, RotateCcw, Volume2 } from "@/components/ui/icon";

const QMODES = [
  { id: "reading", label: "Cách đọc" },
  { id: "vocab", label: "Từ vựng" },
  { id: "meaning", label: "Ý nghĩa" },
] as const;

type QMode = (typeof QMODES)[number]["id"];

const NEXT_DELAY_MS = 800;

/** 3 item nhiễu KHÁC đáp án đúng từ cùng bài, dedupe theo GIÁ TRỊ pinyin (như clone/js/lesson-quiz.js
 *  distractors(): v !== correct && arr.indexOf(v) === i) — tránh 2 nút cùng nhãn khi bài có pinyin trùng.
 *  Nếu bài ít pinyin unique hơn n thì trả ít hơn n (không lặp nhãn). */
export function pickDistractors(all: LessonItem[], correct: LessonItem, n: number = 3): LessonItem[] {
  const seen = new Set<string>([correct.pinyin]);
  return shuffle(all).filter((w) => !seen.has(w.pinyin) && seen.add(w.pinyin)).slice(0, n);
}

/* Answer choice ≥52px (min-h-13) — state correct/error phân biệt bằng icon + label,
   không chỉ màu (Hanzi design system, mã hóa kép). */
function answerState(showCorrect: boolean, showWrong: boolean): { cls: string; icon: ReactNode | null } {
  if (showCorrect) {
    return {
      cls: "border-feedback-success bg-surface-elevated text-feedback-success",
      icon: <CircleCheck size={20} strokeWidth={1.5} aria-hidden="true" />,
    };
  }
  if (showWrong) {
    return {
      cls: "border-feedback-error bg-surface-elevated text-feedback-error animate-[shake_0.4s]",
      icon: <CircleX size={20} strokeWidth={1.5} aria-hidden="true" />,
    };
  }
  return {
    cls: "border-border-default bg-surface-elevated text-text-primary hover:border-action-primary hover:text-action-primary",
    icon: null,
  };
}

export default function QuizMode() {
  const { items, index, setIndex } = useLesson();
  const { speak } = useTts();
  const toast = useToast();

  const total = items.length;
  const item = items[index] ?? items[0];

  const [qMode, setQMode] = useState<QMode>("reading");
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null); // pinyin đã chọn, "__skip__" nếu bỏ qua
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // dọn timer khi unmount (như addCleanup của clone/js/lesson-quiz.js)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // sang câu mới → mở khóa lại (port paintQuestion reset locked)
  useEffect(() => {
    setLocked(false);
    setPicked(null);
  }, [index]);

  const opts = useMemo<LessonItem[]>(
    () => (item ? shuffle([item, ...pickDistractors(items, item)]) : []),
    [items, item]
  );

  const advance = () => {
    if (index >= total - 1) setFinished(true);
    else setIndex(index + 1);
  };

  const answer = (p: string) => {
    if (locked || !item) return;
    setLocked(true);
    setPicked(p);
    if (p === item.pinyin) {
      setScore((s) => s + 1);
      progressStore.addXp(1);
      toast("+1 XP");
    }
    timerRef.current = setTimeout(advance, NEXT_DELAY_MS);
  };

  const skip = () => {
    if (locked || !item) return;
    setLocked(true);
    setPicked("__skip__"); // không cộng XP, chỉ lộ đáp án đúng
    timerRef.current = setTimeout(advance, NEXT_DELAY_MS);
  };

  const restart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScore(0);
    setFinished(false);
    setLocked(false);
    setPicked(null);
    setIndex(0);
  };

  if (!item) return null;

  if (finished) {
    return (
      <Card className="p-6 text-center bg-surface-paper">
        <p className="text-2xl font-extrabold flex items-center justify-center gap-2">
          <PartyPopper size={28} strokeWidth={1.5} aria-hidden="true" />
          Hoàn thành!
        </p>
        <p className="mt-2 text-lg">
          Bạn trả lời đúng <span className="font-extrabold text-action-primary">{score} / {total}</span> câu.
        </p>
        <Button type="button" className="mt-4" onClick={restart}>
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
          Học lại từ đầu
        </Button>
      </Card>
    );
  }

  const isCorrectPicked = picked === item.pinyin;

  return (
    <div>
      {/* toggle hiển thị đề bài + điểm (port header của clone/js/lesson-quiz.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-text-secondary">Cài đặt hiển thị đề bài:</span>
        {QMODES.map((m) => (
          <Chip
            key={m.id}
            data-qmode={m.id}
            className="text-xs"
            selected={qMode === m.id}
            onClick={() => setQMode(m.id)}
          >
            {m.label}
          </Chip>
        ))}
        <span className="ml-auto text-sm font-extrabold text-feedback-success">Đúng: {score}</span>
        <Chip className="text-xs">{index + 1} / {total}</Chip>
      </div>

      {/* câu hỏi — ẩn phần không được chọn theo qMode (giữ hành vi clone) */}
      <Card className="p-6 text-center bg-surface-paper">
        <Chip className="text-xs">Chọn cách đọc đúng</Chip>
        <div className="mt-3">
          {qMode !== "meaning" && (
            <>
              <p className="zh text-[48px] font-extrabold leading-tight">{item.hanzi}</p>
              {qMode === "vocab" && (
                <p className="text-[18px] font-extrabold text-action-primary mt-1">{item.hanViet}</p>
              )}
            </>
          )}
          {qMode === "meaning" && <p className="text-2xl font-extrabold mt-2">{item.meaning}</p>}
        </div>
      </Card>

      {/* 4 đáp án pinyin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4" data-answers>
        {opts.map((o) => {
          const showCorrect = locked && o.pinyin === item.pinyin;
          const showWrong = locked && picked === o.pinyin && !isCorrectPicked;
          const st = answerState(showCorrect, showWrong);
          return (
            <button
              key={o.index}
              type="button"
              data-py={o.pinyin}
              disabled={locked}
              onClick={() => answer(o.pinyin)}
              className={
                "inline-flex items-center justify-center gap-2 min-h-13 px-2 text-lg font-bold border rounded-control transition-colors " +
                st.cls
              }
            >
              {st.icon}
              {o.pinyin}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button type="button" variant="ghost" size="sm" disabled={locked} onClick={skip}>
          Không biết
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => speak(item.hanzi)}>
          <Volume2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Nghe phát âm gợi ý
        </Button>
        <span className="text-xs text-text-secondary">Bí quá thì nghe</span>
      </div>
    </div>
  );
}
