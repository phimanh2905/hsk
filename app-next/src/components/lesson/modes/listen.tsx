"use client";

/* Mode Listen (C6) — nghe ghép câu, port clone/js/lesson-listen.js.
   Pool = shuffle(Array.from(example.zh)) lọc bỏ dấu cách; bấm thẻ pool → nhảy lên mảng built
   (bấm lại trên vùng câu → trả về pool); "Ghép câu" so built.join("") với câu gốc —
   đúng → xanh + +1 XP + tự sang câu sau 1s, sai → feedback đỏ + giữ built để sửa;
   "Gõ lại" reset built + shuffle lại pool; "Nghe câu"/"Nghe lại" speak(example.zh, { rate });
   5 Chip tốc độ 0.5x–2x (selected). Timer + TTS tự dọn khi unmount. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CircleCheck, CircleX, PartyPopper, Play, RotateCcw } from "@/components/ui/icon";

export const listenRates: number[] = [0.5, 0.8, 1, 1.5, 2];

const NEXT_DELAY_MS = 1000;
const WRONG_RESET_MS = 500;

type Token = { ch: string; id: number };

export default function ListenMode() {
  const { items, index, setIndex } = useLesson();
  const { speak, cancel } = useTts();
  const toast = useToastSafe();

  const total = items.length;
  const item = items[index] ?? items[0];

  const [rate, setRate] = useState(1);
  const [pool, setPool] = useState<Token[]>([]);
  const [built, setBuilt] = useState<Token[]>([]);
  const [solved, setSolved] = useState(false);
  const [result, setResult] = useState<"none" | "correct" | "wrong">("none");
  const [finished, setFinished] = useState(false);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // token nguồn của câu hiện tại (giữ id gốc để làm key khi trùng chữ)
  const source = useMemo<Token[]>(
    () =>
      item
        ? Array.from(item.example.zh)
            .map((ch, idx) => ({ ch, id: idx }))
            .filter((t) => t.ch !== " " && t.ch !== "　") // chỉ lọc dấu cách (khác clone: giữ dấu câu)
        : [],
    [item]
  );

  // sang câu mới → pool shuffle lại + built rỗng (port paint)
  useEffect(() => {
    setPool(shuffle(source));
    setBuilt([]);
    setSolved(false);
    setResult("none");
  }, [source]);

  // dọn timer + TTS khi unmount (như addCleanup của clone/js/lesson-listen.js)
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      cancel();
    };
  }, [cancel]);

  const advance = () => {
    if (index >= total - 1) setFinished(true);
    else setIndex(index + 1);
  };

  const speakCurrent = () => {
    if (item) speak(item.example.zh, { rate });
  };

  const pickFromPool = (i: number) => {
    if (solved) return;
    const t = pool[i];
    setPool((p) => p.filter((_, j) => j !== i));
    setBuilt((b) => [...b, t]);
  };

  const returnToPool = (i: number) => {
    if (solved) return;
    const t = built[i];
    setBuilt((b) => b.filter((_, j) => j !== i));
    setPool((p) => [...p, t]);
  };

  const submit = () => {
    if (solved || !item) return;
    const target = Array.from(item.example.zh).filter((c) => c !== " " && c !== "　").join("");
    const guess = built.map((t) => t.ch).join("");
    if (guess === target) {
      setSolved(true);
      setResult("correct");
      progressStore.addXp(1);
      toast("+1 XP");
      nextTimerRef.current = setTimeout(advance, NEXT_DELAY_MS);
    } else {
      setResult("wrong"); // giữ built để sửa
      wrongTimerRef.current = setTimeout(() => setResult("none"), WRONG_RESET_MS);
    }
  };

  const reset = () => {
    if (solved) return;
    setBuilt([]);
    setPool(shuffle(source));
    setResult("none");
  };

  const restart = () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    setFinished(false);
    setSolved(false);
    setResult("none");
    setIndex(0);
  };

  if (!item) return null;

  if (finished) {
    return (
      <Card className="p-6 text-center bg-surface-paper">
        <p className="text-2xl font-extrabold flex items-center justify-center gap-2">
          <PartyPopper size={28} strokeWidth={1.5} aria-hidden="true" />
          Bạn đã ghép xong {total} câu!
        </p>
        <Button type="button" className="mt-4" onClick={restart}>
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
          Luyện lại
        </Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Nghe + tốc độ (port header của clone/js/lesson-listen.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button type="button" data-play size="sm" onClick={speakCurrent}>
          <Play size={16} strokeWidth={1.5} aria-hidden="true" />
          Nghe câu
        </Button>
        <Button type="button" data-replay variant="ghost" size="sm" onClick={speakCurrent}>
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
          Nghe lại
        </Button>
        <span className="text-xs font-bold text-text-secondary ml-2">Tốc độ:</span>
        {listenRates.map((r) => (
          <Chip
            key={r}
            data-rate={r}
            className="text-xs"
            selected={rate === r}
            onClick={() => setRate(r)}
          >
            {r}x
          </Chip>
        ))}
        <Chip className="text-xs ml-auto">{index + 1} / {total}</Chip>
      </div>

      {/* câu của bạn (port data-answer-row) */}
      <Card
        className={
          "p-4 bg-surface-paper min-h-[92px] mb-3 " +
          (result === "correct"
            ? "border-feedback-success"
            : result === "wrong"
              ? "border-feedback-error shake"
              : "")
        }
        data-answer-row
      >
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">Câu của bạn</p>
        <div className="flex flex-wrap gap-1.5 min-h-[44px]" data-answer>
          {built.length === 0 && (
            <span className="text-xs text-text-secondary italic">Bấm thẻ chữ bên dưới để ghép câu…</span>
          )}
          {built.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="inline-flex items-center justify-center h-11 w-11 zh text-xl font-extrabold rounded-control border border-border-default bg-surface-elevated text-text-primary hover:border-action-primary hover:text-action-primary"
              onClick={() => returnToPool(i)}
            >
              {t.ch}
            </button>
          ))}
        </div>
      </Card>

      {/* pool thẻ chữ Hán (port data-pool-row) */}
      <Card className="p-4" data-pool-row>
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">
          Thẻ chữ Hán — bấm để ghép
        </p>
        <div className="flex flex-wrap gap-1.5" data-pool>
          {pool.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="inline-flex items-center justify-center h-11 w-11 zh text-xl font-extrabold rounded-control border border-border-default bg-surface-elevated text-text-primary hover:border-action-primary hover:text-action-primary"
              onClick={() => pickFromPool(i)}
            >
              {t.ch}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button type="button" data-submit disabled={solved} onClick={submit}>
          Ghép câu
        </Button>
        <Button type="button" data-reset variant="ghost" size="sm" onClick={reset}>
          Gõ lại
        </Button>
        <span
          data-feedback
          className={
            "inline-flex items-center gap-1 text-sm font-bold " +
            (result === "correct" ? "text-feedback-success" : result === "wrong" ? "text-feedback-error" : "")
          }
        >
          {result === "correct" && <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />}
          {result === "wrong" && <CircleX size={16} strokeWidth={1.5} aria-hidden="true" />}
          {result === "correct" ? "Chính xác!" : result === "wrong" ? "Chưa đúng thứ tự — nghe lại nhé!" : ""}
        </span>
      </div>
    </div>
  );
}
