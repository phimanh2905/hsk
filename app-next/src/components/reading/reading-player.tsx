"use client";

/* ReadingPlayer — player bài reading + quiz evidence, Task 8 của plan 2026-10-30-reading-library.
   Spec: docs/superpowers/specs/2026-10-30-reading-library-design.md §4.2 + §3.4.

   Playback delegated toàn bộ sang useReadingPlayer (MP3 hoặc fallback TTS bên trong hook);
   component chỉ lo UI: toolbar sticky, bài đọc (pinyin/dịch toggle, highlight câu), quiz
   (chọn đáp án, tô đúng/sai, evidence mark + scroll), onComplete 1 lần per mount. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Pause, Play, SkipBack, SkipForward } from "@/components/ui/icon";
import type { ReadingDoc, ReadingEvidence } from "@/lib/content/readings";
import { useReadingPlayer, type PlayerSentence } from "./use-reading-player";
import { cn } from "@/lib/cn";

export type ReadingPlayerProps = {
  doc: ReadingDoc;
  onComplete?: (correct: number, total: number) => void;
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;

/* Toggle đọc từ localStorage (key nhai.*) — lazy init để tránh chớp UI. */
function readToggle(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function fmt(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Gộp các khoảng evidence của câu thành các slice, mark phủ phần zh[s..e]. */
function renderZhWithEvidence(zh: string, ranges: ReadingEvidence[]) {
  const sorted = [...ranges].sort((a, b) => a.s - b.s).filter((r) => r.e > r.s);
  const out: React.ReactNode[] = [];
  let pos = 0;
  sorted.forEach((r, i) => {
    const s = Math.max(0, Math.min(r.s, zh.length));
    const e = Math.max(s, Math.min(r.e, zh.length));
    if (e <= pos) return; // chồng hoàn toàn vào mark trước
    if (s > pos) out.push(zh.slice(pos, s));
    out.push(
      <mark
        key={`ev-${i}`}
        data-evidence
        data-testid="evidence-mark"
        className="bg-amber-wash/60 underline"
      >
        {zh.slice(Math.max(s, pos), e)}
      </mark>,
    );
    pos = e;
  });
  if (pos < zh.length) out.push(zh.slice(pos));
  return out;
}

export function ReadingPlayer({ doc, onComplete }: ReadingPlayerProps) {
  const sentences: PlayerSentence[] = useMemo(
    () =>
      doc.sentences.map((s) => ({
        zh: s.zh,
        py: s.py || null,
        vi: s.vi,
        audio: s.audio ? `/${doc.audioDir}/${s.audio}` : null,
        durSec: s.durSec,
      })),
    [doc],
  );

  const player = useReadingPlayer(sentences);
  const [showPy, setShowPy] = useState(() => readToggle("nhai.reading.pinyin"));
  const [showVi, setShowVi] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => doc.questions.map(() => null));
  const completedRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const togglePy = useCallback(() => {
    setShowPy((v) => {
      window.localStorage.setItem("nhai.reading.pinyin", v ? "0" : "1");
      return !v;
    });
  }, []);

  const toggleVi = useCallback(() => setShowVi((v) => !v), []);

  /* Đáp án xong hết → onComplete đúng 1 lần per mount (ref guard: "Làm lại" không gọi lại). */
  useEffect(() => {
    if (completedRef.current || doc.questions.length === 0) return;
    if (answers.some((a) => a === null)) return;
    completedRef.current = true;
    const correct = doc.questions.filter((q, i) => answers[i] === q.answer).length;
    onComplete?.(correct, doc.questions.length);
  }, [answers, doc.questions, onComplete]);

  const select = (qi: number, oi: number) => {
    setAnswers((prev) => (prev[qi] !== null ? prev : prev.map((a, i) => (i === qi ? oi : a))));
  };

  const reset = () => setAnswers(doc.questions.map(() => null));

  /* Evidence highlight của các câu đã trả lời, gộp theo sentence index. */
  const evidenceBySi = useMemo(() => {
    const map = new Map<number, ReadingEvidence[]>();
    doc.questions.forEach((q, qi) => {
      if (answers[qi] === null || !q.evidence) return;
      for (const ev of q.evidence) {
        const list = map.get(ev.si) ?? [];
        list.push(ev);
        map.set(ev.si, list);
      }
    });
    return map;
  }, [answers, doc.questions]);

  /* Mark đầu tiên xuất hiện → scroll vào giữa viewport. */
  useEffect(() => {
    bodyRef.current?.querySelector("[data-evidence]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [answers]);

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(player.rate as (typeof RATES)[number]) + 1) % RATES.length] ?? 1;
    player.setRate(next);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <Card className="sticky top-0 z-10 flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Câu trước" variant="ghost" onClick={player.prev}>
            <SkipBack size={18} />
          </IconButton>
          <IconButton label={player.playing ? "Tạm dừng" : "Phát"} variant="solid" onClick={player.toggle}>
            {player.playing ? <Pause size={18} /> : <Play size={18} />}
          </IconButton>
          <IconButton label="Câu sau" variant="ghost" onClick={player.next}>
            <SkipForward size={18} />
          </IconButton>

          <Button
            size="sm"
            variant={player.loopSentence ? "primary" : "ghost"}
            aria-pressed={player.loopSentence}
            onClick={() => player.setLoopSentence(!player.loopSentence)}
          >
            Loop
          </Button>
          <Button size="sm" variant="ghost" onClick={cycleRate}>
            {player.rate}x
          </Button>

          <Button size="sm" variant={showPy ? "primary" : "ghost"} aria-pressed={showPy} onClick={togglePy}>
            拼 Pinyin
          </Button>
          <Button size="sm" variant={showVi ? "primary" : "ghost"} aria-pressed={showVi} onClick={toggleVi}>
            Dịch
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {player.hasAudio && (
            <input
              type="range"
              aria-label="Tua"
              className="min-w-0 flex-1"
              min={0}
              max={Math.max(player.duration, 0.01)}
              step={0.01}
              value={Math.min(player.curTime, player.duration)}
              onChange={(e) => player.seekGlobal(Number(e.target.value))}
            />
          )}
          <span className="text-xs whitespace-nowrap text-text-secondary">
            {fmt(player.curTime)} / {fmt(player.duration)}
          </span>
        </div>
      </Card>

      {/* Bài đọc */}
      <div ref={bodyRef} className="flex flex-col gap-4">
        {doc.sentences.map((s, i) => {
          const evidence = evidenceBySi.get(i);
          return (
            <span key={i} className="flex flex-col">
              {showPy && s.py && (
                <span className="text-xs text-text-secondary">{s.py}</span>
              )}
              <span
                data-sentence={i}
                onClick={() => player.seekSentence(i)}
                className={cn(
                  "zh cursor-pointer rounded-control text-lg leading-relaxed",
                  i === player.curIdx && "bg-surface-muted font-semibold text-action-primary",
                )}
              >
                {evidence ? renderZhWithEvidence(s.zh, evidence) : s.zh}
              </span>
              {showVi && (
                <span className="text-sm italic text-text-secondary">{s.vi}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Quiz */}
      {doc.questions.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-border-default pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Câu hỏi</h2>
            <Button size="sm" variant="ghost" onClick={reset}>
              Làm lại
            </Button>
          </div>
          {doc.questions.map((q, qi) => {
            const chosen = answers[qi];
            return (
              <Card key={qi} data-testid={`question-${qi}`} className="flex flex-col gap-3">
                <div>
                  <p className="zh font-heading text-lg font-semibold" lang="zh">
                    {q.q}
                  </p>
                  <p className="text-sm italic text-text-secondary">{q.qVi}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isAnswer = chosen !== null && oi === q.answer;
                    const isWrongPick = chosen === oi && oi !== q.answer;
                    return (
                      <Button
                        key={oi}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left",
                          "zh",
                          isAnswer && "border-transparent bg-jade-wash hover:bg-jade-wash",
                          isWrongPick && "border-transparent bg-rose-wash hover:bg-rose-wash",
                        )}
                        onClick={() => select(qi, oi)}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
