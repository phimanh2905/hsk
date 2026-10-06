"use client";

/* ReadingQuiz — trắc nghiệm hiểu bài cuối bài đọc (port mock, khác mock chủ ý:
   options data sạch, chữ cái A/B/C sinh từ index ở view). Cho thử lại từng câu
   (không lock): chọn sai rồi chọn đáp án khác vẫn cập nhật. */

import { cn } from "@/lib/cn";
import { Check, X, ICON_STROKE } from "@/components/ui/icon";
import type { ReadingQuizItem } from "@/content/reading";

export function ReadingQuiz({
  quiz,
  answers,
  onAnswer,
}: {
  quiz: ReadingQuizItem[];
  answers: Record<number, number | null>;
  onAnswer: (qi: number, oi: number) => void;
}) {
  const correct = quiz.reduce(
    (n, item, qi) => n + (answers[qi] === item.answer ? 1 : 0),
    0,
  );

  return (
    <section
      data-od-id="reading-quiz"
      className="rounded-card border border-border-default bg-surface-elevated p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-text-primary">Kiểm tra hiểu bài</h2>
        <span className="text-[12.5px] font-semibold text-jade">
          đã đúng {correct}/{quiz.length}
        </span>
      </div>

      <ol className="mt-4 space-y-6">
        {quiz.map((item, qi) => {
          const chosen = answers[qi];
          const answered = chosen !== null && chosen !== undefined;
          const isRight = chosen === item.answer;
          return (
            <li key={qi}>
              <p className="text-[14px] font-semibold text-text-primary">{item.q}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {item.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isAnswer = oi === item.answer;
                  const revealRight = answered && isAnswer;
                  const revealWrong = answered && isChosen && !isAnswer;
                  return (
                    <button
                      key={oi}
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => onAnswer(qi, oi)}
                      className={cn(
                        "flex min-h-11 items-center gap-2.5 rounded-control border px-3 text-left text-[13.5px] text-text-primary transition-colors",
                        revealRight
                          ? "border-jade bg-jade-wash font-semibold"
                          : revealWrong
                            ? "border-rose-line bg-rose-wash"
                            : "border-border-default bg-surface-paper hover:bg-surface-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                          revealRight
                            ? "border-jade bg-jade text-white"
                            : revealWrong
                              ? "border-rose-line bg-rose-line text-rose-ink"
                              : "border-border-default text-text-secondary",
                        )}
                      >
                        {revealRight ? (
                          <Check size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                        ) : revealWrong ? (
                          <X size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                        ) : (
                          String.fromCharCode(65 + oi)
                        )}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p
                  className={cn(
                    "mt-2 text-[13px] font-semibold",
                    isRight ? "text-jade" : "text-rose-ink",
                  )}
                >
                  {isRight ? "Chính xác!" : "Chưa đúng."}
                  {!isRight && (
                    <span className="font-normal">
                      {" "}
                      Đáp án đúng: {String.fromCharCode(65 + item.answer)}. {item.explanation}
                    </span>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
