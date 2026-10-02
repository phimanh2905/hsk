"use client";
/* SoundQuiz (D4) — 5 câu bài tập áp dụng, port 1:1 từ clone/js/sound-rules.js phần quiz.
   Chọn 1 đáp án: đúng viền xanh / sai viền đỏ + shake; không cho chọn lại; hiện giải thích + counter. */

import { useState } from "react";
import { soundRulesData } from "@/content/soundrules";
import { useTts } from "@/lib/tts/use-tts";

const quiz = soundRulesData.quiz;

export default function SoundQuiz() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const { speak } = useTts();

  const answered = Object.keys(picked).length;
  const correct = Object.entries(picked).filter(([qi, oi]) => quiz[Number(qi)].answer === oi).length;

  return (
    <div>
      <div className="space-y-4">
        {quiz.map((q, qi) => {
          const choice = picked[qi];
          const done = choice !== undefined;
          const ok = choice === q.answer;
          return (
            <div key={qi} className="border-2 border-nhai-border rounded-lg p-3">
              <p className="font-extrabold mb-2 text-lg">
                Câu {qi + 1}: {q.q}
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((op, oi) => {
                  const isAnswer = oi === q.answer;
                  const isChoice = done && choice === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={done}
                      onClick={() => {
                        if (done) return;
                        setPicked((p) => ({ ...p, [qi]: oi }));
                        speak(q.options[q.answer]);
                      }}
                      className={`btn-ghost px-4 py-2 text-base font-bold zh ${
                        done && isAnswer
                          ? "pill-active border-green-600"
                          : isChoice
                            ? "border-red-600 animate-[shake_0.4s]"
                            : ""
                      }`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
              {done && (
                <p className="mt-2 text-sm rounded-lg px-3 py-2 bg-nhai-soft">
                  <span className={`font-extrabold ${ok ? "text-green-700" : "text-red-600"}`}>
                    {ok ? "✓ Đúng! " : "✗ Chưa đúng. "}
                  </span>
                  <span>{q.explain}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm font-bold text-nhai-muted">
        Kết quả: Đúng {correct}/{quiz.length} câu đúng
      </p>
    </div>
  );
}
