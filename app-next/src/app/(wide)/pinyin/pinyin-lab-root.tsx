"use client";

/* Pinyin Lab root — port 1:1 opendesign_hsk/pinyin.html (spec 2026-10-05).
   Sở hữu state mode/ma trận/quiz; engine pure ở lib/pinyin/quiz-engine.
   KHÔNG side-effect trong setQuiz updater (StrictMode) — đọc state qua quizRef.
   Quiz build sau mount (hydration-safe); XP + best qua progressStore. */
import { useEffect, useRef, useState } from "react";
import {
  PINYIN_LAB_ART_FIN, PINYIN_LAB_ART_INI, PINYIN_LAB_BASE,
  PINYIN_LAB_FINALS, PINYIN_LAB_GROUPS,
} from "@/content/pinyin-lab";
import {
  buildPool, distractors, pickTarget, type PinyinLabPoolItem,
} from "@/lib/pinyin/quiz-engine";
import { progressStore } from "@/lib/store/progress-store";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import { useToastSafe } from "@/components/shell/toast-provider";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToneLab } from "@/components/pinyin/lab/tone-lab";
import { SoundMatrix } from "@/components/pinyin/lab/sound-matrix";
import { SoundInspector } from "@/components/pinyin/lab/sound-inspector";
import { SandhiRules } from "@/components/pinyin/lab/sandhi-rules";
import { QuizView } from "@/components/pinyin/lab/quiz-view";

const TOTAL = 10;
type Cat = "ini" | "fin" | "tone";
type Mode = "matrix" | "quiz";

type QuizState = {
  qi: number;
  score: number;
  streak: number;
  target: PinyinLabPoolItem | null;
  opts: PinyinLabPoolItem[];
  picked: number | null;
  done: boolean;
};

const IDLE_QUIZ: QuizState = { qi: 0, score: 0, streak: 0, target: null, opts: [], picked: null, done: false };

/* Số đếm động (spec §1) — mock hardcode 23/36, port tính từ data */
const INI_COUNT = PINYIN_LAB_GROUPS.flatMap((g) => g.items).length;
const FIN_COUNT = PINYIN_LAB_FINALS.flatMap((g) => g.items).length;

export default function PinyinLabRoot({
  initialMode,
  initialDrill,
}: {
  initialMode: Mode;
  initialDrill: string | null;
}) {
  const toast = useToastSafe();
  const { speak } = useTts();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [cat, setCat] = useState<Cat>("ini");
  const [art, setArt] = useState<string>("all");
  const [sel, setSel] = useState("b");
  const [quiz, setQuiz] = useState<QuizState>(IDLE_QUIZ);
  const [playing, setPlaying] = useState(false);

  const poolRef = useRef<PinyinLabPoolItem[] | null>(null);
  if (poolRef.current === null) poolRef.current = buildPool();
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const drillRef = useRef<string | null>(initialDrill);
  const settledRef = useRef(false); // XP/best chỉ ghi 1 lần/phiên (Review Focus #5)
  const spokenQRef = useRef(-1); // mỗi câu chỉ tự phát 1 lần
  const bootedRef = useRef(false);

  const pop = () => {
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), 500);
  };

  /* --- ma trận --- */
  const chooseCell = (ch: string) => {
    setSel(ch);
    pop();
    speak(PINYIN_LAB_BASE[ch] ?? ch, { rate: 0.95 }); // mock: speak(BASE[sel])
  };

  /* --- quiz engine (port mock startQuiz/nextQ/answer) --- */
  function nextQ() {
    const pool = poolRef.current!;
    const target = pickTarget(pool, drillRef.current, Math.random);
    const opts = [...distractors(pool, target, Math.random), target];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setQuiz((prev) => ({ ...prev, target, opts, picked: null }));
  }

  function startQuiz(drillIni: string | null) {
    drillRef.current = drillIni;
    settledRef.current = false;
    spokenQRef.current = -1;
    setQuiz({ ...IDLE_QUIZ });
    nextQ();
  }

  /* tự phát câu mới (mock nextQ → speak); StrictMode-safe qua spokenQRef */
  useEffect(() => {
    if (quiz.target && spokenQRef.current !== quiz.qi) {
      spokenQRef.current = quiz.qi;
      pop();
      speak(quiz.target.py, { rate: 0.95 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.target, quiz.qi]);

  function choose(i: number) {
    const prev = quizRef.current;
    if (prev.picked !== null || prev.done || !prev.target) return; // Review Focus #2
    const right = prev.opts.findIndex((o) => o.py === prev.target!.py);
    const ok = i === right;
    const qi = prev.qi + 1;
    const score = prev.score + (ok ? 1 : 0);
    const done = qi >= TOTAL; // mock: nhánh tổng kết là dead-code → port chủ ý hiện tổng kết
    if (done && !settledRef.current) {
      settledRef.current = true;
      progressStore.addXp(score);
      progressStore.recordPinyinLabResult(score);
    }
    setQuiz({ ...prev, picked: i, qi, score, streak: ok ? prev.streak + 1 : 0, done });
  }

  function next() {
    const prev = quizRef.current;
    if (prev.picked === null && !prev.done) return;
    if (prev.done) startQuiz(drillRef.current); // mock: Enter ở tổng kết → phiên mới
    else nextQ();
  }

  function replay() {
    const prev = quizRef.current;
    if (prev.target && prev.picked === null) {
      pop();
      speakRef.current(prev.target.py, { rate: 0.95 });
    }
  }

  function slow() {
    const prev = quizRef.current;
    if (prev.target) speakRef.current(prev.target.py, { rate: 0.65 });
  }

  /* --- keyboard (port mock keydown; useKeyboard bỏ qua INPUT/TEXTAREA) --- */
  useKeyboard({
    " ": (e) => { if (mode === "quiz") { e.preventDefault(); replay(); } },
    "1": () => mode === "quiz" && choose(0),
    "2": () => mode === "quiz" && choose(1),
    "3": () => mode === "quiz" && choose(2),
    "4": () => mode === "quiz" && choose(3),
    a: () => mode === "quiz" && choose(0),
    b: () => mode === "quiz" && choose(1),
    c: () => mode === "quiz" && choose(2),
    d: () => mode === "quiz" && choose(3),
    A: () => mode === "quiz" && choose(0),
    B: () => mode === "quiz" && choose(1),
    C: () => mode === "quiz" && choose(2),
    D: () => mode === "quiz" && choose(3),
    Enter: () => { if (mode === "quiz") next(); },
  });

  /* mount lần đầu ở quiz mode → bắt đầu phiên (hydration: server render skeleton) */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (initialMode === "quiz") startQuiz(initialDrill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header data-od-id="pinyin-header">
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">拼音实验室</span> · Pinyin Lab
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung
        </p>
      </header>

      <div data-od-id="mode-switcher" className="mx-auto w-full max-w-[560px]">
        <SegmentedControl
          label="Chế độ học"
          radius="2xl"
          tabs={[
            { key: "matrix" as const, label: "Ma trận âm & 4 thanh điệu" },
            { key: "quiz" as const, label: "Luyện phản xạ tai nghe" },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "quiz") startQuiz(drillRef.current); // mock: vào tab quiz luôn khởi phiên mới
          }}
        />
      </div>

      {mode === "matrix" ? (
        <div data-od-id="matrix-view">
          <ToneLab />

          <div
            data-od-id="matrix-filters"
            className="mb-3.5 flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-4 py-3.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="min-w-[88px] text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">
                NHÓM CHÍNH
              </span>
              <SegmentedTabs
                label="Nhóm âm"
                tabs={[
                  { key: "ini" as const, label: `Thanh mẫu (${INI_COUNT})` },
                  { key: "fin" as const, label: `Vận mẫu (${FIN_COUNT})` },
                  { key: "tone" as const, label: "Biến âm (一 · 不 · 3声)" },
                ]}
                value={cat}
                onChange={(c) => { setCat(c); setArt("all"); }}
              />
            </div>
            {cat !== "tone" && (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="min-w-[88px] text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">
                  PHÂN LOẠI
                </span>
                <SegmentedTabs
                  label="Vị trí phát âm"
                  tabs={(cat === "ini" ? PINYIN_LAB_ART_INI : PINYIN_LAB_ART_FIN).map(([key, label]) => ({ key, label }))}
                  value={art}
                  onChange={setArt}
                />
              </div>
            )}
          </div>

          {cat === "tone" ? (
            <SandhiRules onSpeak={(s) => speak(s, { rate: 0.95 })} />
          ) : (
            <div className="grid items-start gap-3.5 lg:grid-cols-[6fr_4fr]">
              <section
                data-od-id="sound-matrix"
                aria-label="Ma trận âm"
                className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
              >
                <h2 className="text-sm font-bold text-text-primary">
                  {cat === "ini" ? `Thanh mẫu · Phụ âm đầu (${INI_COUNT})` : `Vận mẫu · Nguyên âm cuối (${FIN_COUNT})`}
                </h2>
                <p className="mb-3 text-xs text-text-secondary">
                  {cat === "ini"
                    ? "Chạm ô để nghe và xem chi tiết bên phải."
                    : "Chạm ô để nghe mẫu. Nhóm: đơn · kép · mũi."}
                </p>
                {cat === "ini" ? (
                  <SoundMatrix
                    key="ini"
                    cat="ini"
                    art={art}
                    sel={sel}
                    onSel={chooseCell}
                    onSpeak={() => {}}
                  />
                ) : (
                  <SoundMatrix
                    key="fin"
                    cat="fin"
                    art={art}
                    sel={sel}
                    onSel={() => {}}
                    onSpeak={(s) => { pop(); speak(s, { rate: 0.95 }); }}
                  />
                )}
              </section>
              <SoundInspector
                sel={sel}
                onDrill={(ch) => {
                  startQuiz(ch);
                  setMode("quiz");
                  toast(`Luyện riêng với âm “${ch}”`);
                }}
                onSpeak={(s) => speak(s, { rate: 0.95 })}
              />
            </div>
          )}
        </div>
      ) : (
        <div data-od-id="quiz-view-wrap">
          {quiz.target || quiz.done ? (
            <QuizView
              qi={quiz.qi}
              total={TOTAL}
              score={quiz.score}
              streak={quiz.streak}
              done={quiz.done}
              opts={quiz.opts}
              target={quiz.target}
              picked={quiz.picked}
              playing={playing}
              onChoose={choose}
              onNext={next}
              onReplay={replay}
              onSlow={slow}
              onReset={() => {
                startQuiz(null); // mock: reset xoá drill
                toast("Phiên mới: 10 câu ngẫu nhiên");
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="mx-auto mt-3.5 h-72 w-full max-w-[640px] animate-pulse rounded-[20px] border border-border-subtle bg-surface-elevated"
            />
          )}
        </div>
      )}
    </div>
  );
}
