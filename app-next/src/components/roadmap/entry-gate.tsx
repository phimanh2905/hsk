"use client";

/* EntryGate — cổng đầu vào HSK1 (spec Roadmap Journey v2 US3): 12 câu nghe
   pinyin từ pinyinExamples, ≥80% → progressStore.setRoadmapGate("hsk1", pct)
   (best-of) rồi onPass. TTS không phát được sau 1.5s → fallback câu đọc
   "Từ nào đọc là …" với options hanzi. Cấu trúc tham khảo station-quiz.tsx. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { pinyinExamples } from "@/content/pinyin";
import { useTts } from "@/lib/tts/use-tts";
import { progressStore } from "@/lib/store/progress-store";
import { GATE_STORE_ID, PASS_PCT, type GateStatus } from "@/lib/roadmap-progress";
import { pickDistractors, type QuizQuestion } from "@/lib/station-quiz";

const GATE_TOTAL = 12;

const TTS_FALLBACK_MS = 1500;

/* useSyncExternalStore với snapshot tĩnh (pct không đổi khi card đang mở) */
const subscribeNoop = () => () => {};

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* Sinh 12 câu hỏi gate từ pinyinExamples: mỗi entry = 1 câu nghe
   (audioText = hanzi, options = 4 pinyin có dấu) + readVariant fallback
   (options = 4 hanzi). Distractor ưu tiên gần-âm (cùng thanh mẫu qua
   pickDistractors), giữ ràng buộc unique theo cả hanzi lẫn pinyin —
   pinyin trùng map-hanzi thì thay bằng candidate sau. Pure. */
export function buildGateQuestions(rng: () => number = Math.random): QuizQuestion[] {
  const pool = Object.values(pinyinExamples).flat();
  const shuffled = shuffle(pool, rng);
  const hanziOfPinyin = new Map(pool.map((e) => [e[1]!, e[0]!]));
  const picked = shuffled.slice(0, GATE_TOTAL);
  return picked.map(([hanzi, pinyin]) => {
    // pickDistractors trả đầy đủ pool (tier gần-âm trước, shuffle trong tier);
    // duyệt theo thứ tự đó, bỏ pinyin/hanzi đã thấy cho tới đủ 3 distractor.
    const ordered = pickDistractors(pinyin!, shuffled.map((e) => e[1]!), rng, shuffled.length - 1);
    const seenHanzi = new Set<string>([hanzi!]);
    const chosenPinyin: string[] = [];
    for (const py of ordered) {
      if (chosenPinyin.length >= 3) break;
      const h = hanziOfPinyin.get(py);
      if (h === undefined || seenHanzi.has(h)) continue;
      chosenPinyin.push(py);
      seenHanzi.add(h);
    }
    const pinyinOpts = shuffle(chosenPinyin, rng);
    pinyinOpts.push(pinyin!);
    const options = shuffle(pinyinOpts, rng);
    const readOpts = shuffle(chosenPinyin.map((py) => hanziOfPinyin.get(py)!), rng);
    readOpts.push(hanzi!);
    const readOptions = shuffle(readOpts, rng);
    return {
      prompt: "🔊 Nghe và chọn phiên âm đúng",
      options,
      answerIndex: options.indexOf(pinyin!),
      listen: {
        audioText: hanzi!,
        readPrompt: `Từ nào đọc là “${pinyin}”?`,
        readOptions,
        readAnswerIndex: readOptions.indexOf(hanzi!),
      },
    };
  });
}

export function EntryGate({ status, onPass }: { status: GateStatus; onPass?: () => void }) {
  const { speak, cancel, speaking } = useTts();
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState(0);
  const questions = useMemo(
    () => buildGateQuestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed đổi khi "Làm lại" để sinh lại bộ câu
    [seed],
  );
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState<{ pct: number; passed: boolean } | null>(null);

  /* TTS fallback: 1.5s sau khi vào câu mà chưa từng phát được (speaking chưa
     từng true) → ttsReady=false, render câu đọc thay vì câu nghe. */
  const [ttsReady, setTtsReady] = useState(true);
  const spokenRef = useRef(false);
  /* Effect phát audio — KHÔNG phụ thuộc speaking: speaking đổi true→false khi
     audio kết thúc không được phép re-run (replay + reset spokenRef khiến câu
     nghe tự fallback giữa chừng dù TTS hoạt động bình thường). */
  useEffect(() => {
    if (!started || finished) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per câu; speak/cancel ổn định qua useCallback của useTts
  }, [started, finished, qIndex, questions]);
  /* Effect riêng chỉ theo dõi speaking: lần đầu phát được → đánh dấu spoken
     (KHÔNG reset) để timer 1.5s không fallback nhầm. ttsReady được reset về
     true ở handler next()/retry() khi sang câu mới — mỗi câu optimistic. */
  useEffect(() => {
    if (speaking) spokenRef.current = true;
  }, [speaking]);

  /* pct đã lưu cho card "open" — đọc từ progressStore (localStorage) qua
     useSyncExternalStore để tránh setState-in-effect + hydration mismatch. */
  const gatePct = useSyncExternalStore(
    subscribeNoop,
    () => progressStore.getRoadmapGate(GATE_STORE_ID)?.pct ?? null,
    () => null,
  );

  if (status === "exempt") {
    return (
      <div
        data-testid="gate-card"
        className="flex items-center gap-3 rounded-card border border-border-default bg-surface-elevated px-4 py-3.5"
      >
        <span aria-hidden="true" className="text-xl">
          ✅
        </span>
        <div>
          <p className="text-[13.5px] font-extrabold">Đã miễn kiểm tra đầu vào</p>
          <p className="text-[12.5px] text-text-secondary">Bạn đã hoàn thành chặng Pinyin</p>
        </div>
      </div>
    );
  }

  if (status === "open") {
    return (
      <div
        data-testid="gate-card"
        className="flex items-center gap-2 rounded-card border border-border-default bg-surface-elevated px-4 py-3.5"
      >
        <Check size={16} aria-hidden="true" />
        <p className="text-[13.5px] font-bold text-jade">
          Đã qua cổng đầu vào{gatePct != null ? ` (${gatePct}%)` : ""}
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div
        data-testid="gate-card"
        className="rounded-card border border-border-default bg-surface-elevated px-4 py-3.5"
      >
        <p className="text-[13.5px] font-extrabold">Kiểm tra đầu vào Pinyin</p>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Nghe 12 từ và chọn phiên âm đúng — đạt ≥ {PASS_PCT}% để mở lộ trình HSK 1.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
        >
          Bắt đầu (12 câu)
        </button>
      </div>
    );
  }

  const q = questions[qIndex];
  const total = questions.length;
  const useRead = q.listen != null && !ttsReady;
  const prompt = useRead ? q.listen!.readPrompt : q.prompt;
  const options = useRead ? q.listen!.readOptions : q.options;
  const answerIndex = useRead ? q.listen!.readAnswerIndex : q.answerIndex;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === answerIndex) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setPicked(null);
      setTtsReady(true); // câu mới optimistic — fallback chỉ do timer 1.5s
      return;
    }
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= PASS_PCT;
    if (passed) progressStore.setRoadmapGate(GATE_STORE_ID, pct); // best-of
    setFinished({ pct, passed });
    if (passed) onPass?.();
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
      <div
        data-testid="gate-result"
        className="flex flex-col items-center gap-2 rounded-card border border-border-default bg-surface-elevated px-4 py-6 text-center"
      >
        <p aria-hidden="true" className="text-3xl">
          {finished.passed ? "🎉" : "💪"}
        </p>
        <p className="text-[15px] font-extrabold">
          {correct}/{total} câu đúng · {finished.pct}%
        </p>
        <p
          className={cn(
            "text-[13.5px] font-bold",
            finished.passed ? "text-jade" : "text-feedback-error-text",
          )}
        >
          {finished.passed
            ? "Đạt! Cổng đầu vào HSK 1 đã mở ✅"
            : `Chưa đạt ${PASS_PCT}% — làm lại nhé`}
        </p>
        {!finished.passed && (
          <button
            type="button"
            onClick={retry}
            className="mt-2 flex min-h-11 items-center justify-center rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
          >
            Làm lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border-default bg-surface-elevated px-4 py-3.5">
      <p data-testid="gate-counter" className="text-xs font-bold text-text-secondary">
        Câu {qIndex + 1}/{total}
      </p>
      <p data-testid="gate-prompt" className="mt-2 text-[15px] leading-snug">
        {prompt}
      </p>
      <div className="mt-3 grid gap-2">
        {options.map((opt, i) => {
          const isAnswer = i === answerIndex;
          const isPicked = picked === i;
          return (
            <button
              key={`${qIndex}-${i}`}
              type="button"
              data-testid="gate-option"
              data-correct={isAnswer ? "true" : "false"}
              onClick={() => pick(i)}
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
        <p data-testid="gate-feedback" className="mt-2 text-sm font-bold">
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
    </div>
  );
}
