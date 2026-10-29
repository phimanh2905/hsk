"use client";

/* Station quiz trong drawer (spec 2026-10-28 §5.2 + Roadmap Journey v2 Task 8):
   MCQ từng câu, chấm ngay, kết quả ghi progress qua submitStationResult
   (best-of, ≥80% pass). Task 8 mở rộng: nhận pool ngoài (trạm generator fetch
   qua useStationVocab), listenEvery (câu nghe mỗi N từ) và render câu nghe —
   nút "Nghe lại" + fallback câu đọc khi TTS không phát được sau 1.5s
   (pattern của EntryGate). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Volume2, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  buildStationQuestions,
  levelPool,
  sampleMilestoneQuestions,
  submitStationResult,
  type QuizQuestion,
  type StationPool,
} from "@/lib/station-quiz";
import { useToastSafe } from "@/components/shell/toast-provider";
import { useTts } from "@/lib/tts/use-tts";
import { PASS_PCT } from "@/lib/roadmap-progress";
import type { Station, RoadmapLevel } from "@/content/roadmap-stations";

const TTS_FALLBACK_MS = 1500;

export function StationQuiz({
  station,
  level,
  onClose,
  pool,
  listenEvery,
  rng,
}: {
  station: Station;
  level: RoadmapLevel;
  onClose: () => void;
  /** Pool ngoài (Task 8): trạm generator dùng pool fetch; bỏ trống → pool level. */
  pool?: StationPool;
  /** Câu nghe mỗi N từ (chỉ trạm generator; trạm curated giữ hành vi cũ). */
  listenEvery?: number;
  /** RNG tiêm vào (test); mặc định Math.random. */
  rng?: () => number;
}) {
  const toast = useToastSafe();
  const { speak, cancel, speaking } = useTts();
  const [seed, setSeed] = useState(0);
  const activePool = pool ?? levelPool(level);
  /* Trạm generator (vocab nhúng rỗng): nguồn câu hỏi là pool fetch
     (pseudo-station), pool vẫn lo distractor. Trạm curated giữ nguyên. */
  const questionSource: Station =
    station.vocab.length === 0 && activePool.vocab.length > 0
      ? { ...station, vocab: activePool.vocab, gram: activePool.gram }
      : station;
  const questions = useMemo<QuizQuestion[]>(
    () =>
      station.kind === "milestone"
        ? sampleMilestoneQuestions(activePool, rng)
        : buildStationQuestions(questionSource, activePool, rng, {
            listenEvery,
            // Spec Journey §3.3: trạm generator fetch cả nhóm (~100 từ) → đúng 8 câu
            maxQuestions: station.vocab.length === 0 ? 8 : 0,
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activePool/rng/questionSource ổn định theo station; seed đổi khi "Làm lại"
    [station.id, level.id, seed],
  );
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState<{
    attemptPct: number;
    bestPct: number;
    passed: boolean;
    improved: boolean;
  } | null>(null);

  /* TTS fallback (pattern EntryGate): vào câu nghe → phát ngay; 1.5s sau nếu
     chưa từng phát được (speaking chưa từng true) → ttsReady=false, render
     câu đọc thay vì câu nghe. Effect phát KHÔNG phụ thuộc speaking. */
  const [ttsReady, setTtsReady] = useState(true);
  const spokenRef = useRef(false);
  useEffect(() => {
    const q = questions[qIndex];
    if (!q?.listen) return;
    spokenRef.current = false;
    speak(q.listen.audioText);
    const t = setTimeout(() => {
      if (!spokenRef.current) setTtsReady(false);
    }, TTS_FALLBACK_MS);
    return () => {
      clearTimeout(t);
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per câu; speak/cancel ổn định qua useCallback
  }, [qIndex, questions]);
  useEffect(() => {
    if (speaking) spokenRef.current = true;
  }, [speaking]);

  const q = questions[qIndex];
  const total = questions.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setPicked(null);
      setTtsReady(true); // câu mới optimistic — fallback chỉ do timer 1.5s
      return;
    }
    const finalCorrect = correct;
    const r = submitStationResult(level.id, station.id, finalCorrect, total);
    const attemptPct = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;
    setFinished({ attemptPct, bestPct: r.pct, passed: r.passed, improved: r.improved });
    // F2: toast theo điểm của lần thi NÀY, không phải best-of
    if (attemptPct >= PASS_PCT) toast(`🎉 Hoàn thành ${station.no} — ${attemptPct}%`);
    else if (r.passed) toast(`Vẫn giữ thành tích ${r.pct}% — làm lại để cải thiện nhé!`);
    else toast(`Chưa đạt ${PASS_PCT}% — làm lại nhé! (${attemptPct}%)`);
  };

  const retry = () => {
    setSeed((s) => s + 1);
    setQIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(null);
    setTtsReady(true);
  };

  if (finished) {
    return (
      <div data-testid="quiz-result" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-3xl">{finished.passed ? "🎉" : "💪"}</p>
        <p className="text-lg font-extrabold">
          {correct}/{total} câu đúng · {finished.attemptPct}%
        </p>
        {!finished.improved && (
          <p data-testid="quiz-best" className="text-sm text-text-secondary">
            Thành tích tốt nhất: {finished.bestPct}%
          </p>
        )}
        <p
          className={cn(
            "text-sm font-bold",
            finished.passed ? "text-jade" : "text-feedback-error-text",
          )}
        >
          {finished.passed ? "Đạt! Buổi học được đánh dấu hoàn thành ✅" : "Cần đạt ≥ 80% để hoàn thành — làm lại nhé!"}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-control border border-border-default bg-surface-muted px-4 text-[13.5px] font-bold hover:border-border-strong"
          >
            Làm lại
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  /* Câu nghe: TTS fallback → swap sang câu đọc (prompt/options/readAnswerIndex). */
  const useRead = q.listen != null && !ttsReady;
  const prompt = useRead ? q.listen!.readPrompt : q.prompt;
  const options = useRead ? q.listen!.readOptions : q.options;
  const answerIndex = useRead ? q.listen!.readAnswerIndex : q.answerIndex;

  return (
    <div>
      <p data-testid="quiz-counter" className="text-xs font-bold text-text-secondary">
        Câu {qIndex + 1}/{total}
      </p>
      <p data-testid="quiz-prompt" className="mt-2 text-[15px] leading-snug">
        {prompt}
      </p>
      {q.listen && (
        <button
          type="button"
          aria-label="Nghe lại"
          onClick={() => {
            spokenRef.current = true;
            setTtsReady(true);
            speak(q.listen!.audioText);
          }}
          className="mt-2 flex min-h-9 items-center gap-1.5 rounded-full border border-border-default bg-surface-muted px-3 text-[12.5px] font-bold hover:border-action-primary hover:text-action-primary"
        >
          <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
          Nghe lại
        </button>
      )}
      <div className="mt-3 grid gap-2">
        {options.map((opt, i) => {
          const isAnswer = i === answerIndex;
          const isPicked = picked === i;
          return (
            <button
              key={`${qIndex}-${i}`}
              type="button"
              data-correct={isAnswer ? "true" : "false"}
              onClick={() => pick(i)}
              aria-label={`quiz-opt-${i}`}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-left text-[13.5px]",
                picked === null && "border-border-default bg-surface-muted hover:border-border-strong",
                picked !== null && isAnswer && "border-jade bg-jade-wash font-bold",
                picked !== null && isPicked && !isAnswer && "border-feedback-error bg-rose-wash",
                picked !== null && !isPicked && !isAnswer && "border-border-default opacity-60",
              )}
            >
              {picked !== null && isAnswer && <Check size={14} aria-hidden="true" />}
              {picked !== null && isPicked && !isAnswer && <X size={14} aria-hidden="true" />}
              <span className="zh">{opt}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p data-testid="quiz-feedback" className="mt-2 text-sm font-bold">
          {picked === answerIndex ? "✅ Đúng" : "❌ Sai"}
        </p>
      )}
      <button
        type="button"
        onClick={next}
        disabled={picked === null}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
      >
        {qIndex === total - 1 ? "Xem kết quả" : "Câu tiếp"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-1 min-h-11 w-full rounded-control text-[13.5px] font-bold text-text-secondary hover:text-text-primary"
      >
        Đóng
      </button>
    </div>
  );
}
