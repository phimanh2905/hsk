"use client";

/* Mode Battle (C8) — Đấu trí, port clone/js/lesson-battle.js.
   13 câu trộn đủ 5 dạng (han2vi, vi2han, han2py, cloze, typing), mỗi câu 4 options;
   timer đếm giây (setInterval 1s — useEffect return clear); kết thúc lưu best qua
   ProgressStore.saveBattleBest (key "nhai.battle.best.<book>.<page>" — giữ tương thích clone).
   "Đăng nhập" mở LoginModal (không điều hướng); Top-10 là dữ liệu cứng theo SPEC-02 §7 (SP1). */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useLesson, type LessonItem } from "../lesson-provider";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { useLoginModal } from "@/components/shell/login-modal";
import { useToastSafe } from "@/components/shell/toast-provider";
import { checkTyped } from "./typing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircleCheck, CircleX, Medal, PartyPopper, Swords, Timer, Trophy, Zap } from "@/components/ui/icon";

export type BattleKind = "han2vi" | "vi2han" | "han2py" | "cloze" | "typing";

export type BattleQuestion = {
  kind: BattleKind;
  item: LessonItem;
  options: string[];
  answer: string;
};

const TOTAL_QUESTIONS = 13;
const NEXT_DELAY_MS = 300;

/* Top-10 cứng theo SPEC-02 §7 (dữ liệu SP1 — không tỉnh đầy đủ tên thật) */
const TOP10 = [
  { rank: "#1", name: "Thùy Trâm", score: "13/13", time: "0:25.9" },
  { rank: "#2", name: "Vân Anh Ngô", score: "13/13", time: "0:26.1" },
  { rank: "#3", name: "vân anh ngô", score: "13/13", time: "0:27.3" },
  { rank: "#4", name: "Nha", score: "13/13", time: "0:27.6" },
  { rank: "#5", name: "Linh Trần", score: "13/13", time: "0:28.1" },
  { rank: "#6", name: "Diễm Kiều", score: "13/13", time: "0:29.3" },
  { rank: "#7", name: "Ngọc Phạm", score: "13/13", time: "0:30.4" },
  { rank: "#8", name: "Hoa Nguyen", score: "13/13", time: "0:31.6" },
  { rank: "#9", name: "Thang Nguyen", score: "13/13", time: "0:34.3" },
  { rank: "#10", name: "Ngọc Lê", score: "13/13", time: "0:34.4" },
];

function rankIcon(rank: string): ReactNode {
  if (rank === "#1") return <Trophy size={16} strokeWidth={1.5} aria-label="Hạng nhất" className="text-learning-streak" />;
  if (rank === "#2" || rank === "#3") return <Medal size={16} strokeWidth={1.5} aria-hidden="true" className="text-text-secondary" />;
  return null;
}

function blanked(w: LessonItem): string {
  const zh = w.example.zh;
  const idx = zh.indexOf(w.hanzi);
  return zh.slice(0, idx) + "__" + zh.slice(idx + w.hanzi.length);
}

function distractors(items: LessonItem[], field: keyof LessonItem, correct: string): string[] {
  return shuffle(
    items
      .map((w) => String(w[field]))
      .filter((v, i, a) => v !== correct && a.indexOf(v) === i)
  ).slice(0, 3);
}

function makeOptions(items: LessonItem[], q: { kind: BattleKind; item: LessonItem }): string[] {
  const field: keyof LessonItem =
    q.kind === "han2vi" ? "meaning" : q.kind === "han2py" || q.kind === "typing" ? "pinyin" : "hanzi";
  return shuffle([q.item[field] as string, ...distractors(items, field, q.item[field] as string)]);
}

/** 13 câu trộn đủ 5 dạng — nếu bài <13 từ thì lặp lại item với dạng khác
 *  (port buildQuestions của clone/js/lesson-battle.js: đổi dạng theo từng vòng). */
export function buildBattleQuestions(items: LessonItem[]): BattleQuestion[] {
  const kinds: BattleKind[] = ["han2vi", "vi2han", "han2py", "cloze", "typing"];
  const questions: BattleQuestion[] = [];
  let i = 0;
  while (questions.length < TOTAL_QUESTIONS) {
    const item = items[i % items.length];
    const lap = Math.floor(i / items.length);
    const kind = kinds[(i + lap) % kinds.length];
    questions.push({ kind, item, options: makeOptions(items, { kind, item }), answer: pickAnswer(kind, item) });
    i++;
    if (i > 200) break;
  }
  return shuffle(questions);
}

function pickAnswer(kind: BattleKind, item: LessonItem): string {
  switch (kind) {
    case "han2vi":
      return item.meaning;
    case "vi2han":
    case "cloze":
      return item.hanzi;
    case "han2py":
    case "typing":
      return item.pinyin;
  }
}

function fmtTime(ms: number): string {
  const sec = ms / 1000;
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  return `${m}:${Number(s) < 10 ? "0" : ""}${s}`;
}

const KIND_LABEL: Record<BattleKind, string> = {
  han2vi: "Chữ Hán → nghĩa",
  vi2han: "Nghĩa → chữ Hán",
  han2py: "Chữ Hán → pinyin",
  cloze: "Điền từ vào câu",
  typing: "Gõ pinyin",
};

/* Answer choice ≥52px (min-h-13) — state correct/error phân biệt bằng icon + label. */
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

export default function BattleMode() {
  const { items, book, page } = useLesson();
  const toast = useToastSafe();

  /* fail loud nếu thiếu LoginProvider — tránh nút Đăng nhập no-op im lặng */
  const openLogin = useLoginModal().openLogin;

  const ctx = book && page ? `${book}.${page}` : "";
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<{ correct: number; timeMs: number; isRecord: boolean } | null>(null);

  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (nextRef.current) clearTimeout(nextRef.current);
    timerRef.current = null;
    nextRef.current = null;
  };

  /* dọn timer khi unmount (như ctx.addCleanup của clone/js/lesson-battle.js) */
  useEffect(() => clearTimers, []);

  const beginBattle = () => {
    clearTimers();
    setQuestions(buildBattleQuestions(items));
    setPos(0);
    setCorrect(0);
    setLocked(false);
    setPicked(null);
    setTyped("");
    setResult(null);
    startRef.current = Date.now();
    setElapsedSec(0);
    setPhase("running");
    // timer đếm giây — dọn trong unmount + khi kết thúc
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const q = questions[pos];

  const finishBattle = (finalCorrect: number) => {
    clearTimers();
    const timeMs = Date.now() - startRef.current;
    const isRecord = progressStore.saveBattleBest(ctx, finalCorrect, timeMs);
    if (isRecord) toast("Kỷ lục mới của bài này!");
    setResult({ correct: finalCorrect, timeMs, isRecord });
    setPhase("done");
  };

  const settle = (ok: boolean) => {
    const finalCorrect = correct + (ok ? 1 : 0);
    if (ok) setCorrect(finalCorrect);
    if (pos >= questions.length - 1) {
      finishBattle(finalCorrect);
    } else {
      nextRef.current = setTimeout(() => {
        setPos((p) => p + 1);
        setLocked(false);
        setPicked(null);
        setTyped("");
      }, NEXT_DELAY_MS);
    }
  };

  const pickOption = (value: string) => {
    if (locked || !q) return;
    setLocked(true);
    setPicked(value);
    settle(value === q.answer);
  };

  const submitTyped = () => {
    if (locked || !q) return;
    setLocked(true);
    setPicked(typed);
    settle(checkTyped(typed, q.item.pinyin));
  };

  if (!q && phase === "running") return null;

  /* ---------- màn intro ---------- */
  if (phase === "intro") {
    const best = progressStore.getBattleBest(ctx);
    return (
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-extrabold flex items-center gap-2">
          <Swords size={24} strokeWidth={1.5} aria-hidden="true" />
          Đấu trí
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          Trả lời 13 câu — trộn ngẫu nhiên 5 dạng: chữ Hán → nghĩa, nghĩa → chữ Hán, chữ Hán → pinyin,
          điền từ vào câu và gõ pinyin. Ai đúng nhiều và nhanh nhất sẽ đứng đầu bảng xếp hạng của bài này.
          Thi lại bao nhiêu lần cũng được — bảng chỉ tính lượt tốt nhất của bạn.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-sm font-semibold text-text-secondary">
            Đăng nhập để lưu kết quả lên bảng xếp hạng.
          </span>
          <Button type="button" data-login size="sm" onClick={openLogin}>
            Đăng nhập
          </Button>
        </div>
        {best && (
          <p className="text-sm font-bold mt-3 flex items-center gap-1.5">
            <Trophy size={16} strokeWidth={1.5} aria-hidden="true" className="text-learning-streak" />
            Kỷ lục của bạn: <span className="text-action-primary">{best.correct}/{TOTAL_QUESTIONS}</span> —{" "}
            {fmtTime(best.timeMs)}
          </p>
        )}
        <Button type="button" data-start className="mt-4" onClick={beginBattle}>
          Bắt đầu thi
        </Button>

        <Card className="p-4 mt-6">
          <h3 className="font-extrabold mb-2 flex items-center gap-1.5">
            <Trophy size={16} strokeWidth={1.5} aria-hidden="true" className="text-learning-streak" />
            Top 10 bài này
          </h3>
          <ol className="text-sm">
            {TOP10.map((r) => (
              <li key={r.rank} className="flex items-center gap-2 py-1 border-b border-border-default last:border-0">
                <span className="w-8 font-bold flex items-center gap-1">
                  {rankIcon(r.rank)}
                  {r.rank}
                </span>
                <span className="flex-1 font-semibold">{r.name}</span>
                <span className="text-text-secondary">{r.score}</span>
                <span className="text-text-secondary w-16 text-right">{r.time}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/leaderboard?tab=battle"
            className="inline-block text-sm font-bold text-action-primary mt-3"
          >
            Xem BXH Đấu trí tháng này →
          </Link>
        </Card>
      </div>
    );
  }

  /* ---------- màn kết quả ---------- */
  if (phase === "done" && result) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card className="p-8" shadow="xs">
          {result.correct >= 10 ? (
            <Trophy size={40} strokeWidth={1.5} aria-hidden="true" className="text-learning-streak mx-auto" />
          ) : result.correct >= 7 ? (
            <PartyPopper size={40} strokeWidth={1.5} aria-hidden="true" className="text-action-primary mx-auto" />
          ) : (
            <Zap size={40} strokeWidth={1.5} aria-hidden="true" className="text-action-primary mx-auto" />
          )}
          <h2 className="text-2xl font-extrabold mt-2">Kết quả Đấu trí</h2>
          <p className="text-lg mt-3">
            Đúng <span className="font-extrabold text-action-primary text-2xl">{result.correct} / {questions.length}</span> câu
          </p>
          <p className="text-lg mt-1">Thời gian: <span className="font-extrabold">{fmtTime(result.timeMs)}</span></p>
          <p className="text-sm font-bold text-text-secondary mt-3">
            Kỷ lục của bạn: {result.correct}/{questions.length} — {fmtTime(result.timeMs)}
            {result.isRecord ? " (mới!)" : ""}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-5">
            <Button type="button" data-again onClick={beginBattle}>
              Thi lại
            </Button>
            <Button
              type="button"
              data-back
              variant="ghost"
              onClick={() => {
                clearTimers();
                setPhase("intro");
              }}
            >
              Về màn chính
            </Button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
            <span className="text-sm font-semibold text-text-secondary">
              Đăng nhập để lưu kết quả lên bảng xếp hạng.
            </span>
            <Button type="button" data-login-done size="sm" onClick={openLogin}>
              Đăng nhập
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- màn thi ---------- */
  const item = q.item;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span data-qnum className="text-sm font-extrabold text-text-secondary">
          Câu {pos + 1} / {questions.length}
        </span>
        <span data-timer className="text-lg font-extrabold inline-flex items-center gap-1.5">
          <Timer size={18} strokeWidth={1.5} aria-hidden="true" />
          {fmtTime(elapsedSec * 1000)}
        </span>
      </div>

      <Card className="p-6 text-center bg-surface-paper">
        <p className="text-xs font-bold text-text-secondary uppercase mb-2">{KIND_LABEL[q.kind]}</p>
        {q.kind === "han2vi" && <p className="zh text-[48px] font-extrabold leading-tight">{item.hanzi}</p>}
        {q.kind === "vi2han" && <p className="text-2xl font-extrabold mt-2">{item.meaning}</p>}
        {q.kind === "han2py" && <p className="zh text-[48px] font-extrabold leading-tight">{item.hanzi}</p>}
        {q.kind === "cloze" && (
          <>
            <p className="zh text-2xl font-extrabold leading-relaxed">{blanked(item)}</p>
            <p className="text-sm text-text-secondary mt-2 italic">→ {item.example.vi}</p>
          </>
        )}
        {q.kind === "typing" && (
          <>
            <p className="zh text-[48px] font-extrabold leading-tight">{item.hanzi}</p>
            <p className="text-base font-semibold mt-2">{item.meaning}</p>
          </>
        )}
      </Card>

      {q.kind === "typing" ? (
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              data-binput
              className={
                "flex-1 min-h-11 rounded-control border px-3 py-2 bg-surface-elevated text-text-primary font-mono focus:outline-none focus:ring-3 ring-action-focus ring-offset-2 " +
                (locked && picked !== q.answer ? "border-feedback-error shake" : "border-border-default")
              }
              placeholder="ni3 → nǐ"
              value={typed}
              disabled={locked}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitTyped();
                }
              }}
            />
            <Button type="button" data-bcheck disabled={locked} onClick={submitTyped}>
              Kiểm tra
            </Button>
            <Button
              type="button"
              data-bskip
              variant="ghost"
              size="sm"
              disabled={locked}
              onClick={() => {
                setLocked(true);
                setPicked(null);
                settle(false);
              }}
            >
              Không biết
            </Button>
          </div>
          {locked && <p className="text-sm font-bold mt-2">Đáp án: {item.pinyin}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4" data-answers>
          {q.options.map((opt) => {
            const isCorrect = opt === q.answer;
            const chosen = picked === opt;
            const st = answerState(locked && isCorrect, locked && chosen && !isCorrect);
            return (
              <button
                key={opt}
                type="button"
                data-answer={isCorrect ? "true" : undefined}
                className={
                  "inline-flex items-center justify-center gap-2 min-h-13 px-2 font-bold border rounded-control transition-colors " +
                  st.cls
                }
                disabled={locked}
                onClick={() => pickOption(opt)}
              >
                {st.icon}
                <span className="zh text-2xl">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
