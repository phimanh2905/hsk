"use client";

/* Bài tập Pinyin — port từ clone/js/pinyin-practice.js.
   D2 theo SPEC-04 §3: 10 câu luân phiên (a) nghe → chọn âm, (b) xem âm → chọn thanh điệu.
   Đáp án ≥52px; đúng/sai mã hóa kép: token + icon (CircleCheck/CircleX) + label. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { pinyinValid } from "@/content/pinyin";
import { toPinyin, shuffle } from "@/lib/pinyin-utils";
import { mulberry32 } from "@/lib/stats/heatmap";
import { useTts } from "@/lib/tts/use-tts";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Chip } from "@/components/ui/chip";
import { CircleCheck, CircleX, RotateCcw, Volume2 } from "@/components/ui/icon";

export type Question = {
  prompt: string;
  options: string[];
  answer: string;
};

function pick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function poolFrom(valid: Record<string, Record<string, string>>): string[] {
  const pool: string[] = [];
  for (const ini of Object.keys(valid)) {
    for (const fin of Object.keys(valid[ini])) {
      const s = valid[ini][fin];
      if (s) pool.push(s);
    }
  }
  return pool;
}

/* Thuần, test được: sinh 1 câu theo dạng "listen" | "tone".
   - listen: prompt = âm, options = 4 syllable khác nhau, answer = prompt.
   - tone: prompt = âm mang 1 thanh ngẫu nhiên, options = 4 dạng thanh của âm đó, answer = prompt. */
export function buildQuestion(
  valid: Record<string, Record<string, string>>,
  kind: "listen" | "tone",
  rng: () => number = Math.random
): Question {
  const pool = poolFrom(valid);
  const syl = pick(pool, rng);
  if (kind === "listen") {
    const distractors = shuffle(pool.filter((s) => s !== syl), rng).slice(0, 3);
    return { prompt: syl, options: shuffle([syl, ...distractors], rng), answer: syl };
  }
  const tone = 1 + Math.floor(rng() * 4);
  // NFD để dấu thanh là combining mark (U+0300–U+036F) — contract của buildQuestion
  const nfd = (s: string) => s.normalize("NFD");
  const marked = nfd(toPinyin(syl + tone));
  const options = shuffle([1, 2, 3, 4].map((t) => nfd(toPinyin(syl + t))), rng);
  return { prompt: marked, options, answer: marked };
}

/* Số thanh điệu từ dấu combining (NFD): macron=1, acute=2, caron=3, grave=4 — mã hóa kép
   shape (dấu) + label (số) cho các đáp án thanh điệu, không phân biệt bằng màu. */
export function toneNumber(option: string): number | null {
  for (const ch of option.normalize("NFD")) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x0304) return 1;
    if (cp === 0x0301) return 2;
    if (cp === 0x030c) return 3;
    if (cp === 0x0300) return 4;
  }
  return null;
}

const TOTAL = 10;

type Round = { kind: "listen" | "tone"; q: Question }[];

// Round mặc định phải TẤT ĐỊNH (module-level) để server và client render cùng
// markup — Math.random() trong useState initializer làm React báo hydration
// mismatch ("server rendered text didn't match the client"). Ngay sau mount ta
// thay bằng một round thật sự ngẫu nhiên.
function buildRound(rng: () => number = Math.random): Round {
  return Array.from({ length: TOTAL }, (_, i) => {
    const kind = i % 2 === 0 ? ("listen" as const) : ("tone" as const);
    return { kind, q: buildQuestion(pinyinValid, kind, rng) };
  });
}

// Hằng module-level: cùng giá trị trên server và client (seed 0 cố định).
const INITIAL_ROUND: Round = buildRound(mulberry32(0));

// Mount-gate: server và client phải render CÙNG markup, nên round đầu chỉ sinh
// SAU mount (trước đó hiện skeleton). Trước fix này buildRound() chạy trong
// useState initializer với Math.random() → mỗi bên render 10 câu khác nhau và
// React báo "server rendered text didn't match the client".

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

export default function PracticeClient() {
  const [round, setRound] = useState<Round>(INITIAL_ROUND);
  // Sau mount mới sinh round thật sự ngẫu nhiên (an toàn hydration: lần render
  // đầu của server và client đều dùng INITIAL_ROUND tất định).
  useEffect(() => {
    setRound(buildRound());
  }, []);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const { speak } = useTts();

  const current = round[qi];
  const done = qi >= TOTAL;
  const listening = current?.kind === "listen";

  useEffect(() => {
    if (current && listening && !picked && !done) {
      const t = setTimeout(() => speak(current.q.prompt, { lang: "zh-CN" }), 250);
      return () => clearTimeout(t);
    }
  }, [current, listening, picked, done, speak]);

  const progress = useMemo(
    () => `Câu ${Math.min(qi + 1, TOTAL)}/${TOTAL}`,
    [qi]
  );

  function choose(opt: string) {
    if (picked || done) return;
    setPicked(opt);
    if (opt === current.q.answer) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setQi((i) => i + 1);
    }, 950);
  }

  function retry() {
    setRound(buildRound());
    setQi(0);
    setScore(0);
    setPicked(null);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Chip className="text-xs py-0.5 font-bold" data-counter>
          {done ? "Hoàn thành" : progress}
        </Chip>
        <span className="text-sm font-bold" data-score>
          Đúng {score}
        </span>
      </div>

      <div className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-6" data-quiz-area>
        {done ? (
          <div className="text-center py-4">
            <h2 className="text-4xl font-extrabold mb-2">
              Đúng {score}/{TOTAL}
            </h2>
            <p className="text-sm font-semibold text-text-secondary mb-5">
              {score === TOTAL
                ? "Tuyệt đối! Bạn đã nắm chắc bảng pinyin"
                : score >= 7
                  ? "Khá tốt! Thử lại để đạt điểm tối đa nhé."
                  : "Đừng lo — vào Bảng Pinyin xem chi tiết rồi quay lại luyện tiếp."}
            </p>
            <Button type="button" onClick={retry}>
              <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" /> Làm lại
            </Button>
            <Link
              href="/pinyin"
              className="block mt-4 text-sm font-semibold text-action-primary hover:underline"
            >
              → Xem lại Bảng Pinyin
            </Link>
          </div>
        ) : (
          <>
            {listening ? (
              <>
                <p className="text-sm font-bold text-text-secondary mb-2">Nghe và chọn âm viết đúng:</p>
                <div className="flex justify-center mb-4">
                  <IconButton
                    label="Nghe lại"
                    variant="solid"
                    className="w-16 h-16"
                    onClick={() => speak(current.q.prompt, { lang: "zh-CN" })}
                  >
                    <Volume2 size={24} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {current.q.options.map((opt) => {
                    const st = answerState(
                      !!picked && opt === current.q.answer,
                      !!picked && opt === picked && opt !== current.q.answer
                    );
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!picked}
                        onClick={() => choose(opt)}
                        className={
                          "inline-flex items-center justify-center gap-2 min-h-13 px-2 text-xl font-bold border rounded-control transition-colors " +
                          st.cls
                        }
                      >
                        {st.icon}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-text-secondary mb-2">Âm sau mang thanh điệu nào?</p>
                <h2 className="text-6xl font-extrabold text-center my-5 zh">{current.q.prompt}</h2>
                <div className="grid grid-cols-4 gap-2">
                  {current.q.options.map((opt) => {
                    const tn = toneNumber(opt);
                    const st = answerState(
                      !!picked && opt === current.q.answer,
                      !!picked && opt === picked && opt !== current.q.answer
                    );
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!picked}
                        onClick={() => choose(opt)}
                        className={
                          "inline-flex flex-col items-center justify-center gap-0.5 min-h-13 px-1 text-2xl font-bold border rounded-control transition-colors " +
                          st.cls
                        }
                      >
                        <span className="leading-tight zh">{opt}</span>
                        {tn !== null && (
                          <span className="text-[10px] font-bold leading-tight">
                            Thanh {tn}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
