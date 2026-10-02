"use client";

/* Mode Listen (C6) — nghe ghép câu, port clone/js/lesson-listen.js.
   Pool = shuffle(Array.from(example.zh)) lọc bỏ dấu cách; bấm thẻ pool → nhảy lên mảng built
   (bấm lại trên vùng câu → trả về pool); "Ghép câu" so built.join("") với câu gốc —
   đúng → xanh + +1 XP + tự sang câu sau 1s, sai → feedback đỏ + giữ built để sửa;
   "Gõ lại" reset built + shuffle lại pool; "Nghe câu"/"Nghe lại" speak(example.zh, { rate });
   5 pill tốc độ 0.5x–2x (active pill-active). Timer + TTS tự dọn khi unmount. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";

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
      toast("⚡ +1 XP");
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
      <div className="card p-6 text-center bg-[var(--nhai-bg)]">
        <p className="text-2xl font-extrabold">🎉 Bạn đã ghép xong {total} câu!</p>
        <button type="button" className="btn-main px-4 py-2.5 mt-4" onClick={restart}>
          🔄 Luyện lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Nghe + tốc độ (port header của clone/js/lesson-listen.js) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" data-play className="btn-main px-4 py-2 text-sm" onClick={speakCurrent}>
          ▶ Nghe câu
        </button>
        <button type="button" data-replay className="btn-ghost px-3 py-2 text-sm" onClick={speakCurrent}>
          ↻ Nghe lại
        </button>
        <span className="text-xs font-bold text-[var(--nhai-muted)] ml-2">Tốc độ:</span>
        {listenRates.map((r) => (
          <button
            key={r}
            type="button"
            data-rate={r}
            className={`pill text-xs py-1 ${rate === r ? "pill-active" : ""}`}
            onClick={() => setRate(r)}
          >
            {r}x
          </button>
        ))}
        <span className="pill text-xs ml-auto">{index + 1} / {total}</span>
      </div>

      {/* câu của bạn (port data-answer-row) */}
      <div
        className={
          "card p-4 bg-[var(--nhai-bg)] min-h-[92px] mb-3 " +
          (result === "correct"
            ? "border-green-600"
            : result === "wrong"
              ? "border-red-600 shake"
              : "")
        }
        data-answer-row
      >
        <p className="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Câu của bạn</p>
        <div className="flex flex-wrap gap-1.5 min-h-[44px]" data-answer>
          {built.length === 0 && (
            <span className="text-xs text-[var(--nhai-muted)] italic">Bấm thẻ chữ bên dưới để ghép câu…</span>
          )}
          {built.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="btn-ghost w-11 h-11 zh text-xl font-extrabold"
              onClick={() => returnToPool(i)}
            >
              {t.ch}
            </button>
          ))}
        </div>
      </div>

      {/* pool thẻ chữ Hán (port data-pool-row) */}
      <div className="card p-4" data-pool-row>
        <p className="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">
          Thẻ chữ Hán — bấm để ghép
        </p>
        <div className="flex flex-wrap gap-1.5" data-pool>
          {pool.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="btn-ghost w-11 h-11 zh text-xl font-extrabold"
              onClick={() => pickFromPool(i)}
            >
              {t.ch}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button type="button" data-submit className="btn-main px-4 py-2" disabled={solved} onClick={submit}>
          Ghép câu
        </button>
        <button type="button" data-reset className="btn-ghost px-3 py-2 text-sm" onClick={reset}>
          Gõ lại
        </button>
        <span data-feedback className={"text-sm font-bold " + (result === "correct" ? "text-green-700" : result === "wrong" ? "text-red-600" : "")}>
          {result === "correct" ? "✅ Chính xác!" : result === "wrong" ? "❌ Chưa đúng thứ tự — nghe lại nhé!" : ""}
        </span>
      </div>
    </div>
  );
}
