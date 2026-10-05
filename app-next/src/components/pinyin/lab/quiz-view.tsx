"use client";

/* View luyện phản xạ — port #viewQuiz của mock: quiz-head + deck (emit, slow,
   4 options A–D, feedback, next). Presentational; engine + TTS ở root. */
import { Flame, Volume2 } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PINYIN_LAB_DESC } from "@/content/pinyin-lab";
import type { PinyinLabPoolItem } from "@/lib/pinyin/quiz-engine";
import { cn } from "@/lib/cn";

const KEYS = ["A", "B", "C", "D"];

export type QuizViewProps = {
  qi: number;
  total: number;
  score: number;
  streak: number;
  done: boolean;
  opts: PinyinLabPoolItem[];
  target: PinyinLabPoolItem | null;
  picked: number | null;
  playing: boolean;
  onChoose: (i: number) => void;
  onNext: () => void;
  onReplay: () => void;
  onSlow: () => void;
  onReset: () => void;
};

export function QuizView(p: QuizViewProps) {
  const rightIdx = p.target && !p.done ? p.opts.findIndex((o) => o.py === p.target!.py) : -1;
  const acc = p.qi ? Math.round((p.score / p.qi) * 100) : null;

  return (
    <div data-od-id="quiz-view">
      <div
        data-od-id="quiz-header"
        className="flex flex-wrap items-center gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-[18px] py-3.5 text-[13.5px] font-bold text-text-primary"
      >
        <span>Câu {Math.min(p.qi + 1, p.total)} / {p.total}</span>
        <span className="text-text-secondary">·</span>
        <span>Độ chính xác: {acc === null ? "—" : acc + "%"}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-line bg-amber-wash px-3 py-1 text-xs font-extrabold text-amber-ink">
          <Flame size={13} aria-hidden="true" /> Chuỗi đúng: <b>{p.streak}</b>
        </span>
        <IconButton
          label="Chơi lại phiên mới"
          variant="ghost"
          className="h-9 min-h-9 w-9 min-w-9 rounded-[10px]"
          onClick={p.onReset}
        >
          ×
        </IconButton>
      </div>

      <div
        data-od-id="quiz-deck"
        className="mx-auto mt-3.5 w-full max-w-[640px] rounded-[20px] border border-border-subtle bg-surface-elevated px-6 py-7 text-center shadow-xs"
      >
        <button
          type="button"
          aria-label="Nghe âm thanh"
          onClick={p.onReplay}
          className={cn(
            "inline-grid h-20 w-20 place-items-center rounded-full border border-action-primary bg-action-primary text-white shadow-[0_10px_26px_rgba(200,60,50,.35)] transition-transform hover:scale-105 active:scale-95",
            p.playing && "animate-[pop_0.5s_ease]",
          )}
        >
          <Volume2 size={32} strokeWidth={2} aria-hidden="true" />
        </button>
        <div>
          <button
            type="button"
            onClick={p.onSlow}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-4 py-2 text-[12.5px] font-bold text-text-secondary hover:border-action-primary hover:text-action-primary"
          >
            Nghe chậm 0.8x
          </button>
        </div>
        <p className="mt-2.5 text-[13px] font-medium text-text-secondary">
          Nghe kỹ và chọn âm tiết đúng vừa phát ra <b className="text-text-primary">(Space = nghe lại)</b>
        </p>

        {!p.done && (
          <div data-od-id="quiz-opts" className="mt-[18px] grid grid-cols-1 gap-2.5 min-[481px]:grid-cols-2">
            {p.opts.map((o, i) => {
              const isPicked = p.picked === i;
              const isRight = p.picked !== null && i === rightIdx;
              return (
                <button
                  key={o.py + i}
                  type="button"
                  data-opt={i}
                  disabled={p.picked !== null}
                  onClick={() => p.onChoose(i)}
                  className={cn(
                    "flex min-h-[76px] items-center gap-3 rounded-[14px] border border-border-subtle bg-surface-muted px-[18px] text-2xl font-semibold tracking-[0.02em] text-text-primary",
                    p.picked === null && "hover:border-border-strong",
                    isRight && "good border-2 border-learning-mastered bg-jade-wash text-jade",
                    isPicked && !isRight && "bad border-2 border-action-primary bg-rose-wash text-rose-ink animate-[shake_0.35s_ease]",
                    p.picked !== null && "cursor-default",
                  )}
                >
                  <span className="grid h-7 w-7 min-w-7 place-items-center rounded-full border border-border-subtle bg-surface-elevated text-[11px] font-extrabold text-text-secondary">
                    {KEYS[i]}
                  </span>
                  <span>{o.py}</span>
                </button>
              );
            })}
          </div>
        )}

        {!p.done && p.picked !== null && p.target && (
          <div
            data-od-id="quiz-feedback"
            className="mt-3.5 rounded-xl border border-border-subtle bg-surface-muted p-3.5 text-left text-[13.5px] text-text-primary"
          >
            {p.picked === rightIdx ? (
              <>
                <b className="text-feedback-success">Chính xác!</b> “{p.target.py}” (<span className="zh">{p.target.zh}</span> — {p.target.vi}). {PINYIN_LAB_DESC[p.target.ini]}
              </>
            ) : (
              <>
                <b className="text-action-primary">Chưa đúng.</b> Đáp án là “{p.target.py}” (<span className="zh">{p.target.zh}</span> — {p.target.vi}). {PINYIN_LAB_DESC[p.target.ini]}
              </>
            )}
          </div>
        )}

        {p.done && (
          <div
            data-od-id="quiz-feedback"
            className="mt-3.5 rounded-xl border border-border-subtle bg-surface-muted p-3.5 text-left text-[13.5px] text-text-primary"
          >
            <b className="text-feedback-success">Hoàn thành phiên!</b> Đúng {p.score}/{p.total} ({Math.round((p.score / p.total) * 100)}%).{" "}
            {p.score >= 8 ? "Tai nghe rất thính!" : p.score >= 5 ? "Tiến bộ rõ — luyện thêm nhóm âm yếu nhé." : "Hãy nghe chậm và đối chiếu từng cặp."}
          </div>
        )}

        <button
          type="button"
          disabled={p.picked === null && !p.done}
          onClick={p.onNext}
          className="mt-3.5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border border-action-primary bg-action-primary text-[14.5px] font-semibold text-white hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-muted disabled:text-text-secondary disabled:shadow-none"
        >
          {p.done ? "Chơi phiên mới (Enter)" : p.picked !== null ? "Câu tiếp theo (Enter)" : "Chọn một đáp án để kiểm tra"}
        </button>
      </div>
    </div>
  );
}
