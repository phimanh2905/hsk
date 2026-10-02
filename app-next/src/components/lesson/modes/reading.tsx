"use client";

/* Mode Reading (C5) — điền từ vào câu ví dụ, port clone/js/lesson-reading.js.
   Đề = clozeZh(example.zh, item.hanzi): chỗ trống render ô gạch dưới thay blank,
   bản dịch example.vi hiện sẵn, toggle "Nghĩa" ẩn/hiện meaning,
   4 đáp án chữ Hán = từ đúng + 3 hanzi khác trong cùng bài (shuffle),
   "Câu này bó tay" → setIndex(index+1) không XP, "🔊 Nghe câu ví dụ gợi ý" → speak(example.zh) (câu GỐC),
   chấm như C3 (xanh/đỏ/rung, tự sang câu sau 800ms, đúng +1 XP). */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle, pinyinLine } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";

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
      toast("⚡ +1 XP");
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
      <div className="card p-6 text-center bg-[var(--nhai-bg)]">
        <p className="text-2xl font-extrabold">🎉 Hoàn thành!</p>
        <p className="mt-2 text-lg">
          Bạn điền đúng <span className="font-extrabold text-[var(--nhai-main)]">{score} / {total}</span> câu.
        </p>
        <button type="button" className="btn-main px-4 py-2.5 mt-4" onClick={restart}>
          🔄 Luyện lại
        </button>
      </div>
    );
  }

  const { before, blank, after } = clozeZh(item.example.zh, item.hanzi);
  const isCorrectPicked = picked === item.hanzi;

  return (
    <div>
      {/* toggle Nghĩa + điểm (port header của clone/js/lesson-reading.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          data-meaning-toggle
          className={`pill text-xs py-1 ${showMeaning ? "pill-active" : ""}`}
          onClick={() => setShowMeaning((v) => !v)}
        >
          Nghĩa
        </button>
        <span className="text-xs text-[var(--nhai-muted)]">Bật để xem gợi ý nghĩa của từ</span>
        <span className="ml-auto text-sm font-extrabold text-green-700">Đúng: {score}</span>
        <span className="pill text-xs">{index + 1} / {total}</span>
      </div>

      {/* câu khuyết + bản dịch (port card của clone/js/lesson-reading.js) */}
      <div className="card p-6 bg-[var(--nhai-bg)]">
        <p className="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Điền từ vào chỗ trống</p>
        <p className="zh text-2xl sm:text-3xl font-extrabold leading-relaxed" data-sentence>
          {before}
          <span
            className={
              "inline-block min-w-16 border-b-4 text-center mx-1 " +
              (locked
                ? isCorrectPicked
                  ? "border-green-600 text-green-700"
                  : "border-red-600 text-red-600"
                : "border-[var(--nhai-main)]")
            }
          >
            {locked ? blank : "____"}
          </span>
          {after}
        </p>
        <p className="text-xs text-[var(--nhai-muted)] mt-1">{pinyinLine(item.example.pinyinPerChar)}</p>
        <p className="text-sm text-[var(--nhai-muted)] mt-2 italic">→ {item.example.vi}</p>
        <p className={"text-sm font-bold text-[var(--nhai-main)] mt-1 " + (showMeaning ? "" : "hidden")}>
          Từ cần điền: {item.meaning}
        </p>
      </div>

      {/* 4 đáp án chữ Hán */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4" data-answers>
        {opts.map((h) => {
          const showCorrect = locked && h === item.hanzi;
          const showWrong = locked && picked === h && !isCorrectPicked;
          return (
            <button
              key={h}
              type="button"
              data-hanzi={h}
              disabled={locked}
              onClick={() => answer(h)}
              className={
                "py-3 text-2xl zh font-extrabold border-2 rounded-lg transition-colors " +
                (showCorrect
                  ? "border-green-600 bg-green-50 text-green-700"
                  : showWrong
                    ? "border-red-600 bg-red-50 text-red-600 shake"
                    : "btn-ghost")
              }
            >
              {h}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button type="button" className="btn-ghost px-3 py-2 text-sm" disabled={locked} onClick={giveup}>
          Câu này bó tay
        </button>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm"
          onClick={() => speak(item.example.zh)}
        >
          🔊 Nghe câu ví dụ gợi ý
        </button>
      </div>
    </div>
  );
}
