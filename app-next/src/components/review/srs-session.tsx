"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icon";
import { useTts } from "@/lib/tts/use-tts";
import type { ReviewableWord } from "@/lib/srs-session";
import type { Grade } from "@/lib/stats/review";

const GRADES: { grade: Grade; label: string; hint: string; cls: string }[] = [
  { grade: "forgot", label: "Quên", hint: "Sau 1 phút", cls: "bg-feedback-error/10 border-feedback-error/40 text-feedback-error-text" },
  { grade: "hard", label: "Khó", hint: "Sau 5 phút", cls: "bg-amber-wash border-learning-streak/40 text-amber-ink" },
  { grade: "good", label: "Nhớ", hint: "Từ tiếp theo", cls: "bg-action-primary border-action-primary text-white" },
];

/* Overlay phiên ôn (mock .session, spec §3/§5). words là snapshot — dashboard
   ghi grade qua onGrade; mem%/buckets cập nhật sau khi phiên kết thúc. */
export function SrsSession({ words, onGrade, onExit }: {
  words: ReviewableWord[];
  onGrade: (key: string, grade: Grade) => void;
  onExit: (score: number, total: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { speak } = useTts();
  const exitRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    exitRef.current?.focus();
    return () => prevFocusRef.current?.focus?.();
  }, []);

  const w = words[idx];
  const finish = (s: number) => onExit(s, words.length);

  /* phát âm thẻ mới khi chưa reveal (mock renderSess(false) → speak) */
  useEffect(() => {
    if (w && !revealed) speak(w.zh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const reveal = () => setRevealed(true);

  const grade = (g: Grade) => {
    if (!revealed || !w) return;
    const s = g === "good" ? score + 1 : score;
    onGrade(w.key, g);
    if (idx >= words.length - 1) { finish(s); return; }
    setIdx(idx + 1);
    setRevealed(false);
    setScore(s);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { finish(score); return; }
      if (!w) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (revealed) speak(w.zh);
        else reveal();
        return;
      }
      if (e.key === "1") grade("forgot");
      else if (e.key === "2") grade("hard");
      else if (e.key === "3") grade("good");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pct = words.length ? Math.round((idx / words.length) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập"
      className="fixed inset-0 z-60 flex flex-col bg-surface-paper"
    >
      <header className="sticky top-0 border-b border-border-default bg-surface-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2.5 px-4 py-2.5">
          <IconButton ref={exitRef} label="Thoát phiên ôn tập" variant="ghost" onClick={() => finish(score)}>
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
          <div className="flex-1 text-center">
            <div className="text-xs text-text-secondary">Từ {idx + 1} / {words.length}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-subtle">
              <div data-testid="sess-fill" className="h-full rounded-full bg-learning-mastered transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span data-testid="sess-score" aria-live="polite" className="text-xs font-bold text-text-secondary">{score} nhớ</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center gap-4 p-5">
        <div
          data-testid="sess-card"
          aria-live="polite"
          onClick={() => { if (!revealed) reveal(); }}
          className="w-[min(480px,100%)] cursor-pointer rounded-[24px] border border-border-default bg-surface-elevated p-8 text-center shadow-xs active:scale-[.99]"
        >
          <div data-testid="sess-glyph" className="zh text-[64px] leading-[1.35]">{w?.zh}</div>
          <div data-testid="sess-py" className={`mt-1 text-xl text-text-secondary ${revealed ? "" : "hidden"}`}>{w?.pinyin}</div>
          <div data-testid="sess-mean" className={`mt-3 font-bold ${revealed ? "" : "hidden"}`}>
            {w?.meaning} · độ bền {w?.mem}%
          </div>
        </div>

        <div className="grid w-[min(480px,100%)] gap-2.5">
          {!revealed && (
            <button
              type="button"
              onClick={reveal}
              className="min-h-[54px] rounded-2xl border border-border-default bg-surface-muted text-sm font-bold"
            >
              Chạm để xem nghĩa · Space
            </button>
          )}
          <div
            data-testid="sess-grades"
            className={revealed ? "grid gap-2.5 max-[480px]:grid-cols-1 min-[480px]:grid-cols-3" : "hidden"}
          >
            {GRADES.map((g) => (
              <button
                key={g.grade}
                type="button"
                data-grade={g.grade}
                onClick={() => grade(g.grade)}
                className={`flex min-h-[72px] flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 text-[13.5px] font-bold ${g.cls}`}
              >
                {g.label}
                <small className="text-[11px] font-normal opacity-85">{g.hint}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
