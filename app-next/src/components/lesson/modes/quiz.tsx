"use client";

/* Mode Quiz (C3) — trắc nghiệm 4 đáp án pinyin, port clone/js/lesson-quiz.js.
   Toggle đề (Cách đọc/Từ vựng/Ý nghĩa — ẩn phần không chọn, giữ hành vi clone),
   4 nút pinyin (đáp án đúng + 3 nhiễu cùng bài), đúng → +1 XP + toast + sang câu sau 800ms,
   sai → viền đỏ + rung, "Không biết" → sang câu sau không cộng XP, gợi ý phát âm. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLesson, type LessonItem } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToast } from "@/components/shell/toast-provider";

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
      toast("⚡ +1 XP");
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
      <div className="card p-6 text-center bg-[var(--nhai-bg)]">
        <p className="text-2xl font-extrabold">🎉 Hoàn thành!</p>
        <p className="mt-2 text-lg">
          Bạn trả lời đúng <span className="font-extrabold text-[var(--nhai-main)]">{score} / {total}</span> câu.
        </p>
        <button type="button" className="btn-main py-3 px-4 mt-4 text-base" onClick={restart}>
          🔄 Học lại từ đầu
        </button>
      </div>
    );
  }

  const isCorrectPicked = picked === item.pinyin;

  return (
    <div>
      {/* toggle hiển thị đề bài + điểm (port header của clone/js/lesson-quiz.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-[var(--nhai-muted)]">Cài đặt hiển thị đề bài:</span>
        {QMODES.map((m) => (
          <button
            key={m.id}
            type="button"
            data-qmode={m.id}
            className={`pill text-xs py-1 ${qMode === m.id ? "pill-active" : ""}`}
            onClick={() => setQMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <span className="ml-auto text-sm font-extrabold text-green-700">Đúng: {score}</span>
        <span className="pill text-xs">{index + 1} / {total}</span>
      </div>

      {/* câu hỏi — ẩn phần không được chọn theo qMode (giữ hành vi clone) */}
      <div className="card p-6 text-center bg-[var(--nhai-bg)]">
        <span className="pill text-xs py-0.5">Chọn cách đọc đúng</span>
        <div className="mt-3">
          {qMode !== "meaning" && (
            <>
              <p className="zh text-5xl font-extrabold">{item.hanzi}</p>
              {qMode === "vocab" && (
                <p className="text-lg font-extrabold text-[var(--nhai-main)] mt-1">{item.hanViet}</p>
              )}
            </>
          )}
          {qMode === "meaning" && <p className="text-2xl font-extrabold mt-2">{item.meaning}</p>}
        </div>
      </div>

      {/* 4 đáp án pinyin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4" data-answers>
        {opts.map((o) => {
          const showCorrect = locked && o.pinyin === item.pinyin;
          const showWrong = locked && picked === o.pinyin && !isCorrectPicked;
          return (
            <button
              key={o.index}
              type="button"
              data-py={o.pinyin}
              disabled={locked}
              onClick={() => answer(o.pinyin)}
              className={
                "py-3 px-2 text-lg font-bold border-2 rounded-lg transition-colors " +
                (showCorrect
                  ? "border-green-600 bg-green-50 text-green-700"
                  : showWrong
                    ? "border-red-600 bg-red-50 text-red-600 animate-[shake_0.4s]"
                    : "btn-ghost")
              }
            >
              {o.pinyin}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button type="button" className="btn-ghost px-3 py-2 text-sm" disabled={locked} onClick={skip}>
          Không biết
        </button>
        <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => speak(item.hanzi)}>
          🔊 Nghe phát âm gợi ý
        </button>
        <span className="text-xs text-[var(--nhai-muted)]">Bí quá thì nghe</span>
      </div>
    </div>
  );
}
