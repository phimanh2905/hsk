"use client";

/* Mode Typing (C4) — gõ pinyin số thanh điệu (ni3 → nǐ), port clone/js/lesson-typing.js.
   Toggle đề: Cách đọc/Âm Hán/Chữ Hán (ẩn phần không chọn), hàng ô `_` = số âm tiết,
   1 input duy nhất, chấm qua checkTyped (bỏ dấu 2 bên — "ni3 hao3" ≡ "nǐ hǎo"),
   đúng → viền xanh + +1 XP + tự sang thẻ sau 800ms, sai → viền đỏ + rung,
   gợi ý "Gợi ý (k/5)" lộ dần expected.slice(0, hints), đạt 5 nút disabled. */

import { useEffect, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { toPinyin, stripTones, splitPinyin } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PartyPopper, RotateCcw } from "@/components/ui/icon";

const NEXT_DELAY_MS = 800;

const TMODES = [
  { id: "reading", label: "Cách đọc" },
  { id: "hanviet", label: "Âm Hán" },
  { id: "hanzi", label: "Chữ Hán" },
] as const;

type TMode = (typeof TMODES)[number]["id"];

/** Chuẩn hoá 2 bên qua toPinyin + stripTones ("ni3 hao3" đúng với "nǐ hǎo").
 *  Gõ đủ số thanh -> so nguyên dấu sau khi chuyển số->dấu (sai thanh bị từ chối:
 *  "ni3 hao4" ≠ "nǐ hǎo"); không gõ thanh -> stripTones 2 bên vẫn chấp nhận.
 *  Gộp khoảng trắng để so "wang2 lao3shi1" ≡ "wáng lǎoshī". Export thuần để test. */
export function checkTyped(input: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const marks = norm(toPinyin(input));
  if (/\d/.test(input)) return marks === norm(expected);
  return stripTones(marks) === stripTones(expected);
}

export default function TypingMode() {
  const { items, index, setIndex } = useLesson();

  const total = items.length;
  const item = items[index] ?? items[0];

  const [tMode, setTMode] = useState<TMode>("reading");
  const [score, setScore] = useState(0);
  const [typed, setTyped] = useState("");
  const [hints, setHints] = useState(0);
  const [state, setState] = useState<"typing" | "correct" | "wrong">("typing");
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // dọn timer khi unmount (như addCleanup của clone/js/lesson-typing.js)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  // sang câu mới → reset trạng thái (port paintQuestion reset hints/done/input)
  useEffect(() => {
    setTyped("");
    setHints(0);
    setState("typing");
  }, [index]);

  const advance = () => {
    if (index >= total - 1) setFinished(true);
    else setIndex(index + 1);
  };

  const check = () => {
    if (state !== "typing" || !item) return;
    if (checkTyped(typed, item.pinyin)) {
      setState("correct");
      setScore((s) => s + 1);
      progressStore.addXp(1);
      timerRef.current = setTimeout(advance, NEXT_DELAY_MS);
    } else {
      setState("wrong");
      wrongTimerRef.current = setTimeout(() => setState("typing"), 400); // giữ input để sửa
    }
  };

  const addHint = () => {
    if (state !== "typing" || hints >= 5) return;
    setHints((h) => h + 1);
  };

  const restart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScore(0);
    setFinished(false);
    setTyped("");
    setHints(0);
    setState("typing");
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
          Bạn gõ đúng <span className="font-extrabold text-action-primary">{score} / {total}</span> từ.
        </p>
        <Button type="button" className="mt-4" onClick={restart}>
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
          Luyện lại từ đầu
        </Button>
      </Card>
    );
  }

  const syls = splitPinyin(item.pinyin);
  const typedWords = typed.trim().split(/\s+/).filter(Boolean);
  const hintShown = item.pinyin.slice(0, hints);

  const stateBorder =
    state === "correct"
      ? "border-feedback-success"
      : state === "wrong"
        ? "border-feedback-error"
        : "border-border-default";

  return (
    <div>
      {/* toggle hiển thị đề bài + điểm (port header của clone/js/lesson-typing.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-text-secondary">Đề bài:</span>
        {TMODES.map((m) => (
          <Chip
            key={m.id}
            data-tmode={m.id}
            className="text-xs"
            selected={tMode === m.id}
            onClick={() => setTMode(m.id)}
          >
            {m.label}
          </Chip>
        ))}
        <span className="ml-auto text-sm font-extrabold text-feedback-success">Đúng: {score}</span>
        <Chip className="text-xs">{index + 1} / {total}</Chip>
      </div>

      {/* đề + hàng ô trống (port card của clone/js/lesson-typing.js) */}
      <Card className={"p-6 text-center bg-surface-paper " + stateBorder + (state === "wrong" ? " shake" : "")}>
        <Chip className="text-xs">{item.pos}</Chip>
        <div className="mt-3">
          {tMode === "reading" && <p className="zh text-[48px] font-extrabold leading-tight">{item.hanzi}</p>}
          {tMode === "hanviet" && (
            <p className="text-3xl font-extrabold text-action-primary">{item.hanViet}</p>
          )}
          {tMode === "hanzi" && (
            <p className="text-2xl font-extrabold font-mono">{stripTones(item.pinyin)}</p>
          )}
        </div>
        <p className="text-base font-semibold mt-2">{item.meaning}</p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {syls.map((_, i) => (
            <span
              key={i}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border-default rounded-control text-lg font-bold bg-surface-elevated"
            >
              {typedWords[i] ?? "_"}
            </span>
          ))}
        </div>
      </Card>

      {/* input + Kiểm tra + Gợi ý (port hàng action của clone/js/lesson-typing.js) */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <input
          type="text"
          data-input
          className={
            "flex-1 min-w-[220px] min-h-11 rounded-control border px-3 py-2 bg-surface-elevated text-text-primary font-mono focus:outline-none focus:ring-3 ring-action-focus ring-offset-2 " +
            stateBorder
          }
          placeholder="Gõ pinyin, số là thanh điệu (ni3 → nǐ)"
          value={typed}
          disabled={state === "correct"}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
        />
        <Button type="button" disabled={state === "correct"} onClick={check}>
          Kiểm tra
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={hints >= 5 || state === "correct"}
          onClick={addHint}
        >
          Gợi ý ({hints}/5)
        </Button>
      </div>
      {hints > 0 && (
        <p className="text-[18px] font-bold text-action-primary mt-2">
          {hintShown.split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </p>
      )}
      <p className="text-xs text-text-secondary mt-2">
        Mẹo: gõ “ni3 hao3” → nǐ hǎo, “lv4” → lǜ. Nhấn Enter để kiểm tra.
      </p>
    </div>
  );
}
