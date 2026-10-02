"use client";

/* Mode Reading (C5) — điền từ vào câu ví dụ, port clone/js/lesson-reading.js.
   Đề = clozeZh(example.zh, item.hanzi): chỗ trống render ô gạch dưới thay blank,
   bản dịch example.vi hiện sẵn, toggle "Nghĩa" ẩn/hiện meaning,
   4 đáp án chữ Hán = từ đúng + 3 hanzi khác trong cùng bài (shuffle),
   "Câu này bó tay" → setIndex(index+1) không XP, "Nghe câu ví dụ gợi ý" → speak(example.zh) (câu GỐC),
   chấm như C3 (xanh/đỏ/rung, tự sang câu sau 800ms, đúng +1 XP). */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle, pinyinLine } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CircleCheck, CircleX, PartyPopper, RotateCcw, Volume2 } from "@/components/ui/icon";

const NEXT_DELAY_MS = 800;

/** Tách câu ví dụ quanh vị trí từ đang học (zh.indexOf(hanzi));
 *  fallback: không tìm thấy → thay 2 ký tự đầu của câu. Export thuần để test. */
export function clozeZh(zh: string, hanzi: string): { before: string; blank: string; after: string } {
  const idx = zh.indexOf(hanzi);
  if (idx >= 0) {
    return { before: zh.slice(0, idx), blank: hanzi, after: zh.slice(idx + hanzi.length) };
  }
  const chars = Array.from(zh);
  return { before: "", blank: chars.slice(0, 2).join(""), after: chars.slice(2).join("") };
}

/* Answer choice ≥52px (min-h-13) — state correct/error phân biệt bằng icon + label. */
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

export default function ReadingMode() {
  const { items, index, setIndex } = useLesson();
  const { speak } = useTts();
  const toast = useToastSafe();

  const total = items.length;
  const item = items[index] ?? items[0];

  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null); // hanzi đã chọn, "__skip__" nếu bó tay
  const [showMeaning, setShowMeaning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // dọn timer khi unmount (như addCleanup của clone/js/lesson-reading.js)
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

  const opts = useMemo<string[]>(() => {
    if (!item) return [];
    // 3 nhiễu = hanzi khác của các từ cùng bài, dedupe theo giá trị (như clone/js/lesson-reading.js)
    const seen = new Set<string>([item.hanzi]);
    const distract = shuffle(items)
      .map((w) => w.hanzi)
      .filter((h) => !seen.has(h) && seen.add(h))
      .slice(0, 3);
    return shuffle([item.hanzi, ...distract]);
  }, [items, item]);

  const advance = () => {
    if (index >= total - 1) setFinished(true);
    else setIndex(index + 1);
  };

  const answer = (h: string) => {
    if (locked || !item) return;
    setLocked(true);
    setPicked(h);
    if (h === item.hanzi) {
      setScore((s) => s + 1);
      progressStore.addXp(1);
      toast("+1 XP");
    }
    timerRef.current = setTimeout(advance, NEXT_DELAY_MS);
  };

  // "Câu này bó tay" — sang câu kế ngay, không cộng XP, không đụng score
  const giveup = () => {
    if (locked || !item) return;
    setLocked(true);
    setPicked("__skip__");
    advance();
  };

  const restart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScore(0);
    setFinished(false);
    setLocked(false);
    setPicked(null);
    setShowMeaning(false);
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
          Bạn điền đúng <span className="font-extrabold text-action-primary">{score} / {total}</span> câu.
        </p>
        <Button type="button" className="mt-4" onClick={restart}>
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
          Luyện lại
        </Button>
      </Card>
    );
  }

  const { before, blank, after } = clozeZh(item.example.zh, item.hanzi);
  const isCorrectPicked = picked === item.hanzi;

  return (
    <div>
      {/* toggle Nghĩa + điểm (port header của clone/js/lesson-reading.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip
          data-meaning-toggle
          className="text-xs"
          selected={showMeaning}
          onClick={() => setShowMeaning((v) => !v)}
        >
          Nghĩa
        </Chip>
        <span className="text-xs text-text-secondary">Bật để xem gợi ý nghĩa của từ</span>
        <span className="ml-auto text-sm font-extrabold text-feedback-success">Đúng: {score}</span>
        <Chip className="text-xs">{index + 1} / {total}</Chip>
      </div>

      {/* câu khuyết + bản dịch (port card của clone/js/lesson-reading.js) */}
      <Card className="p-6 bg-surface-paper">
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">Điền từ vào chỗ trống</p>
        <p className="zh text-2xl sm:text-3xl font-extrabold leading-relaxed" data-sentence>
          {before}
          <span
            className={
              "inline-block min-w-16 border-b-4 text-center mx-1 " +
              (locked
                ? isCorrectPicked
                  ? "border-feedback-success text-feedback-success"
                  : "border-feedback-error text-feedback-error"
                : "border-action-primary")
            }
          >
            {locked ? blank : "____"}
          </span>
          {after}
        </p>
        <p className="text-xs text-text-secondary mt-1">{pinyinLine(item.example.pinyinPerChar)}</p>
        <p className="text-sm text-text-secondary mt-2 italic">→ {item.example.vi}</p>
        <p className={"text-sm font-bold text-action-primary mt-1 " + (showMeaning ? "" : "hidden")}>
          Từ cần điền: {item.meaning}
        </p>
      </Card>

      {/* 4 đáp án chữ Hán */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4" data-answers>
        {opts.map((h) => {
          const showCorrect = locked && h === item.hanzi;
          const showWrong = locked && picked === h && !isCorrectPicked;
          const st = answerState(showCorrect, showWrong);
          return (
            <button
              key={h}
              type="button"
              data-hanzi={h}
              disabled={locked}
              onClick={() => answer(h)}
              className={
                "inline-flex flex-col items-center justify-center gap-1 min-h-13 py-2 text-2xl zh font-extrabold border rounded-control transition-colors " +
                st.cls
              }
            >
              {st.icon}
              {h}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button type="button" variant="ghost" size="sm" disabled={locked} onClick={giveup}>
          Câu này bó tay
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => speak(item.example.zh)}
        >
          <Volume2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Nghe câu ví dụ gợi ý
        </Button>
      </div>
    </div>
  );
}
