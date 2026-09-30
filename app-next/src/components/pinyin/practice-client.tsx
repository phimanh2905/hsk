"use client";

/* Bài tập Pinyin — port từ clone/js/pinyin-practice.js.
   D2 theo SPEC-04 §3: 10 câu luân phiên (a) nghe → chọn âm, (b) xem âm → chọn thanh điệu. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { pinyinValid } from "@/content/pinyin";
import { toPinyin, shuffle } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";

export type Question = {
  prompt: string;
  options: string[];
  answer: string;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  kind: "listen" | "tone"
): Question {
  const pool = poolFrom(valid);
  const syl = pick(pool);
  if (kind === "listen") {
    const distractors = shuffle(pool.filter((s) => s !== syl)).slice(0, 3);
    return { prompt: syl, options: shuffle([syl, ...distractors]), answer: syl };
  }
  const tone = 1 + Math.floor(Math.random() * 4);
  // NFD để dấu thanh là combining mark (U+0300–U+036F) — contract của buildQuestion
  const nfd = (s: string) => s.normalize("NFD");
  const marked = nfd(toPinyin(syl + tone));
  const options = shuffle([1, 2, 3, 4].map((t) => nfd(toPinyin(syl + t))));
  return { prompt: marked, options, answer: marked };
}

const TOTAL = 10;

type Round = { kind: "listen" | "tone"; q: Question }[];

function buildRound(): Round {
  return Array.from({ length: TOTAL }, (_, i) => ({
    kind: i % 2 === 0 ? ("listen" as const) : ("tone" as const),
    q: buildQuestion(pinyinValid, i % 2 === 0 ? "listen" : "tone"),
  }));
}

export default function PracticeClient() {
  const [round, setRound] = useState<Round>(() => buildRound());
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
        <span className="pill text-xs py-0.5 font-bold" data-counter>
          {done ? "Hoàn thành" : progress}
        </span>
        <span className="text-sm font-bold" data-score>
          Đúng {score}
        </span>
      </div>

      <div className="card shadow-neo p-6" data-quiz-area>
        {done ? (
          <div className="text-center py-4">
            <h2 className="text-4xl font-extrabold mb-2">
              Đúng {score}/{TOTAL}
            </h2>
            <p className="text-sm font-semibold text-nhai-muted mb-5">
              {score === TOTAL
                ? "Tuyệt đối! Bạn đã nắm chắc bảng pinyin 🎉"
                : score >= 7
                  ? "Khá tốt! Thử lại để đạt điểm tối đa nhé."
                  : "Đừng lo — vào Bảng Pinyin xem chi tiết rồi quay lại luyện tiếp."}
            </p>
            <button type="button" onClick={retry} className="btn-main px-6 py-2.5">
              🔄 Làm lại
            </button>
            <Link
              href="/pinyin"
              className="block mt-4 text-sm font-semibold text-nhai-accent hover:underline"
            >
              → Xem lại Bảng Pinyin
            </Link>
          </div>
        ) : (
          <>
            {listening ? (
              <>
                <p className="text-sm font-bold text-nhai-muted mb-2">Nghe và chọn âm viết đúng:</p>
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    onClick={() => speak(current.q.prompt, { lang: "zh-CN" })}
                    className="btn-main w-16 h-16 text-2xl"
                    title="Nghe lại"
                    aria-label="Nghe lại"
                  >
                    🔊
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {current.q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!!picked}
                      onClick={() => choose(opt)}
                      className={`py-3 text-xl font-bold ${
                        picked
                          ? opt === current.q.answer
                            ? "pill-active"
                            : opt === picked
                              ? "btn-ghost border-red-600 text-red-600"
                              : "btn-ghost opacity-60"
                          : "btn-ghost"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-nhai-muted mb-2">Âm sau mang thanh điệu nào?</p>
                <h2 className="text-6xl font-extrabold text-center my-5">{current.q.prompt}</h2>
                <div className="grid grid-cols-4 gap-2">
                  {current.q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!!picked}
                      onClick={() => choose(opt)}
                      className={`py-3 text-2xl font-bold ${
                        picked
                          ? opt === current.q.answer
                            ? "pill-active"
                            : opt === picked
                              ? "btn-ghost border-red-600 text-red-600"
                              : "btn-ghost opacity-60"
                          : "btn-ghost"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
