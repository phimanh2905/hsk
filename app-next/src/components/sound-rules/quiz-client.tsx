"use client";
/* SoundQuiz (D4) — 5 câu bài tập áp dụng, port 1:1 từ clone/js/sound-rules.js phần quiz.
   Chọn 1 đáp án: đúng/sai mã hóa kép (token + icon CircleCheck/CircleX + label), ≥52px;
   không cho chọn lại; hiện giải thích + counter. */

import { useState } from "react";
import { soundRulesData } from "@/content/soundrules";
import { useTts } from "@/lib/tts/use-tts";
import { CircleCheck, CircleX } from "@/components/ui/icon";

const quiz = soundRulesData.quiz;

export default function SoundQuiz() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const { speak } = useTts();

  const correct = Object.entries(picked).filter(([qi, oi]) => quiz[Number(qi)].answer === oi).length;

  return (
    <div>
      <div className="space-y-4">
        {quiz.map((q, qi) => {
          const choice = picked[qi];
          const done = choice !== undefined;
          const ok = choice === q.answer;
          return (
            <div key={qi} className="border border-border-default rounded-card p-3">
              <p className="font-extrabold mb-2 text-lg">
                Câu {qi + 1}: {q.q}
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((op, oi) => {
                  const isAnswer = oi === q.answer;
                  const isChoice = done && choice === oi;
                  const showCorrect = done && isAnswer;
                  const showWrong = isChoice && !ok;
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
                      className={`inline-flex items-center gap-2 min-h-[52px] px-4 text-base font-bold zh rounded-control border transition-colors ${
                        showCorrect
                          ? "border-feedback-success bg-surface-elevated text-feedback-success"
                          : showWrong
                            ? "border-feedback-error bg-surface-elevated text-feedback-error animate-[shake_0.4s]"
                            : "border-border-default bg-surface-elevated text-text-primary hover:border-action-primary hover:text-action-primary"
                      }`}
                    >
                      {showCorrect && <CircleCheck size={18} strokeWidth={1.5} aria-hidden="true" />}
                      {showWrong && <CircleX size={18} strokeWidth={1.5} aria-hidden="true" />}
                      {op}
                    </button>
                  );
                })}
              </div>
              {done && (
                <p className="mt-2 text-sm rounded-control px-3 py-2 bg-surface-paper">
                  <span
                    className={`inline-flex items-center gap-1.5 font-extrabold ${
                      ok ? "text-feedback-success" : "text-feedback-error"
                    }`}
                  >
                    {ok ? (
                      <>
                        <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" /> Đúng!
                      </>
                    ) : (
                      <>
                        <CircleX size={16} strokeWidth={1.5} aria-hidden="true" /> Chưa đúng.
                      </>
                    )}
                  </span>{" "}
                  <span>{q.explain}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm font-bold text-text-secondary" data-quiz-result>
        Kết quả: Đúng {correct}/{quiz.length} câu đúng
      </p>
    </div>
  );
}
