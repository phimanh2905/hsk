"use client";

/* SessionClient (E3) — trang buổi học lộ trình pinyin, port clone/js/roadmap-session.js
   + SPEC-21 §B–C: 4 tab Học ✓ / Flashcard / Trắc nghiệm / Bài kiểm tra, unlock tuần tự.
   Tab Bài kiểm tra gated bởi sessionStatus(getRoadmapDone(), n) (Task 26);
   hoàn thành → progressStore.markRoadmapSession(n) (Task 6) → timeline mở buổi kế. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roadmapSessions } from "@/content/roadmap";
import { progressStore } from "@/lib/store/progress-store";
import { sessionStatus } from "@/lib/roadmap-status";
import { checkTyped } from "@/components/lesson/modes/typing";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import { Clock, Lock, Volume2, ICON_STROKE } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

type Tab = "learn" | "flash" | "quiz" | "test";
const TABS: Tab[] = ["learn", "flash", "quiz", "test"];
const TAB_LABELS: Record<Tab, string> = {
  learn: "Học",
  flash: "Flashcard",
  quiz: "Trắc nghiệm",
  test: "Bài kiểm tra",
};
// Đọc/ghi qua ProgressStore (không đụng localStorage trực tiếp) để SP2 sync được.

function readLearnSeen(): number[] {
  return progressStore.getRoadmapLearnSeen();
}


function markLearnSeen(n: number): void {
  progressStore.markRoadmapLearnSeen(n);
}

/* Đáp án trắc nghiệm: state đúng/sai qua token feedback, không palette Tailwind thô. */
function answerCls(state: "idle" | "correct" | "wrong" | "muted"): string {
  switch (state) {
    case "correct":
      return "border-feedback-success bg-feedback-success/10 font-bold text-feedback-success";
    case "wrong":
      return "border-action-danger bg-action-danger/10 text-text-primary";
    case "muted":
      return "border-border-default opacity-60";
    default:
      return "border-border-default hover:border-action-primary";
  }
}

export default function SessionClient({ n }: { n: number }): React.JSX.Element {
  const session = roadmapSessions[n - 1];
  const router = useRouter();
  const toast = useToastSafe();
  const { speak } = useTts();

  const [tab, setTab] = useState<Tab>("learn");
  const [learnSeen, setLearnSeen] = useState<number[]>([]);

  const [fcIndex, setFcIndex] = useState(0);
  const [fcKnown, setFcKnown] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(() => session.quiz.map(() => null));

  const [testPick, setTestPick] = useState<number | null>(null);
  const [essay, setEssay] = useState("");
  const [writtenGraded, setWrittenGraded] = useState(false);

  /* Mount-gate như TimelineClient (Task 26): server/pre-mount dùng default an toàn
     (done = [] → n===1 "current", buổi khác "locked"; learnSeen rỗng) — chỉ đọc
     localStorage sau mount để tránh hydration mismatch. */
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    setDone(progressStore.getRoadmapDone());
    setLearnSeen(readLearnSeen());
  }, []);

  const locked = sessionStatus(mounted ? done : [], n) === "locked";

  const mcItem = session.test.find((x) => x.kind === "quiz");
  const essayItem = session.test.find((x) => x.kind === "written");
  const writtenCorrect =
    writtenGraded && essayItem?.kind === "written" ? checkTyped(essay, essayItem.accept[0]) : false;
  const testScore = (testPick !== null && mcItem?.kind === "quiz" && testPick === mcItem.answer ? 1 : 0) + (writtenCorrect ? 1 : 0);

  function switchTab(t: Tab): void {
    if (t === "test" && locked) {
      toast("Bài kiểm tra chỉ mở khi bạn đã hoàn thành buổi trước");
      return;
    }
    setTab(t);
    if (t === "flash") {
      setFcIndex(0);
      setFcKnown(0);
      setFlipped(false);
    }
    if (t === "quiz") setQuizAnswers(session.quiz.map(() => null));
    if (t === "test") {
      setTestPick(null);
      setEssay("");
      setWrittenGraded(false);
    }
  }

  const tabIdx = TABS.indexOf(tab);

  return (
    <div>
      <Link href="/roadmap/pinyin" className="text-sm font-bold text-action-primary hover:underline">
        ‹ Lộ trình pinyin
      </Link>
      <h2 className="text-2xl font-extrabold tracking-tight mt-1">Buổi {n} — {session.title}</h2>
      <p className="text-sm text-text-secondary mt-1 mb-3 flex items-center gap-1.5">
        <Clock size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
        {session.minutes} phút · {session.desc}
      </p>

      {/* Progress bar mỏng: tab hiện tại /4 */}
      <div className="h-1 w-full bg-border-default rounded-full mb-4" role="progressbar" aria-label="Tiến trình buổi học">
        <div
          className="h-1 bg-action-primary rounded-full transition-all"
          style={{ width: `${((tabIdx + 1) / TABS.length) * 100}%` }}
        />
      </div>

      {/* 4 tab */}
      <div className="flex flex-wrap gap-2 mb-5" role="tablist">
        {TABS.map((t) => {
          const isLocked = t === "test" && locked;
          const isActive = t === tab;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={isActive}
              aria-disabled={isLocked || undefined}
              data-locked={isLocked ? "true" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 min-h-11 rounded-control border px-4 text-sm font-bold transition-colors",
                "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
                isActive
                  ? "bg-action-primary text-white border-transparent hover:bg-action-primary-hover"
                  : "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary",
                isLocked && "opacity-60 cursor-not-allowed",
              )}
              onClick={() => switchTab(t)}
            >
              {TAB_LABELS[t]}
              {t === "learn" && learnSeen.includes(n) ? <span aria-hidden="true">✓</span> : null}
              {isLocked ? <Lock size={14} strokeWidth={ICON_STROKE} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      {/* ---------- Tab Học ---------- */}
      {tab === "learn" && (
        <div>
          {n === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {session.learn.map((t) =>
                t.tone && t.ex ? (
                  <Card key={t.tone} className="p-4 flex flex-col items-center text-center gap-1">
                    <span className="text-4xl font-extrabold">{t.tone}</span>
                    <span className="text-xs font-bold text-action-primary uppercase tracking-wide">{t.name}</span>
                    <span className="text-sm text-text-secondary">{t.detail}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="zh text-2xl font-bold">{t.ex.hanzi}</span>
                      <span className="text-sm font-semibold">{t.ex.pinyin}</span>
                      <span className="text-xs text-text-secondary">{t.ex.meaning}</span>
                      <IconButton
                        label="Nghe phát âm"
                        className="text-sm shrink-0"
                        onClick={() => speak(t.ex!.pinyin.replace(/\s/g, ""), { rate: 0.8 })}
                      >
                        <Volume2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                      </IconButton>
                    </div>
                  </Card>
                ) : null
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {session.learn.map((t) => (
                <Card key={t.title ?? t.detail} className="p-4">
                  <h4 className="font-extrabold mb-1">{t.title}</h4>
                  <p className="text-sm text-text-secondary">{t.detail}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Bảng "Tự nhận biết" 2 cột */}
          <Card className="p-4 mb-4">
            <h4 className="font-extrabold mb-2">Tự nhận biết</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary uppercase">
                  <th className="py-1 pr-2">Chữ</th>
                  <th className="py-1">Pinyin · nghĩa</th>
                </tr>
              </thead>
              <tbody>
                {session.cards.map((c) => (
                  <tr key={c.hanzi + c.pinyin} className="border-t border-border-default">
                    <td className="py-2 pr-2">
                      <span className="zh text-xl font-bold">{c.hanzi}</span>
                    </td>
                    <td className="py-2">
                      <span className="font-semibold">{c.pinyin}</span>{" "}
                      <span className="text-xs text-text-secondary">({c.hv})</span> — {c.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                markLearnSeen(n);
                setLearnSeen(readLearnSeen());
                switchTab("flash");
              }}
            >
              Đã đọc xong, sang thẻ ghi nhớ →
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Tab Flashcard ---------- */}
      {tab === "flash" && (
        <div>
          {fcIndex >= session.cards.length ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-extrabold mb-2 flex items-center justify-center gap-1.5">
                Đã ôn {fcKnown}/{session.cards.length} thẻ
                <span aria-hidden="true">✓</span>
              </p>
              <p className="text-sm text-text-secondary mb-4">
                Lật từng thẻ để tự kiểm tra — bấm “Đã thuộc” khi nhớ, “Chưa thuộc” để ôn lại sau.
              </p>
              <div className="flex justify-center gap-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setFcIndex(0);
                  setFcKnown(0);
                  setFlipped(false);
                }}>
                  Ôn lại từ đầu
                </Button>
                <Button type="button" onClick={() => switchTab("quiz")}>
                  Sang Trắc nghiệm →
                </Button>
              </div>
            </Card>
          ) : (
            <div>
              <p className="text-center text-xs font-bold text-text-secondary mb-2">
                {fcIndex + 1}/{session.cards.length} thẻ
              </p>
              <button
                type="button"
                className="w-full rounded-card border border-border-default bg-surface-elevated p-8 text-center min-h-[10rem] flex flex-col items-center justify-center gap-2 hover:border-action-primary transition-colors focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
                title="Bấm để lật thẻ"
                onClick={() => setFlipped((f) => !f)}
              >
                {flipped ? (
                  <>
                    <span className="text-2xl font-extrabold text-action-primary">{session.cards[fcIndex].pinyin}</span>
                    <span className="text-xs text-text-secondary">({session.cards[fcIndex].hv})</span>
                    <span className="text-lg font-bold">{session.cards[fcIndex].meaning}</span>
                  </>
                ) : (
                  <>
                    <span className="zh text-5xl font-extrabold">{session.cards[fcIndex].hanzi}</span>
                    <span className="text-xs text-text-secondary">Bấm để xem pinyin &amp; nghĩa</span>
                  </>
                )}
              </button>
              <div className="flex justify-center gap-3 mt-4">
                <Button type="button" variant="secondary" onClick={() => {
                  setFlipped(false);
                  setFcIndex((i) => i + 1);
                }}>
                  Chưa thuộc
                </Button>
                <Button type="button" onClick={() => {
                  setFlipped(false);
                  setFcKnown((k) => k + 1);
                  setFcIndex((i) => i + 1);
                }}>
                  Đã thuộc
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab Trắc nghiệm ---------- */}
      {tab === "quiz" && (
        <div>
          {session.quiz.map((q, qi) => {
            const a = quizAnswers[qi];
            return (
              <Card key={q.q} className="p-4 mb-4">
                <p className="font-bold mb-3">{qi + 1}. {q.q}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => {
                    let state: "idle" | "correct" | "wrong" | "muted" = "idle";
                    if (a !== null) {
                      if (oi === q.answer) state = "correct";
                      else if (oi === a) state = "wrong";
                      else state = "muted";
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={cn(
                          "min-h-[52px] rounded-control border px-3 py-2 text-sm text-left bg-surface-elevated text-text-primary transition-colors",
                          "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
                          answerCls(state),
                        )}
                        disabled={a !== null}
                        onClick={() => {
                          const next = [...quizAnswers];
                          next[qi] = oi;
                          setQuizAnswers(next);
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {a !== null && (
                  <p className={cn("text-xs mt-2 font-semibold", a === q.answer ? "text-feedback-success" : "text-text-primary")}>
                    {a === q.answer ? "Đúng! " : "Chưa đúng. "}
                    {q.explain}
                  </p>
                )}
              </Card>
            );
          })}
          {quizAnswers.some((a) => a !== null) && (
            <Card className="p-4 flex items-center justify-between gap-3">
              <p className="font-extrabold">
                Đúng {quizAnswers.filter((a, i) => a === session.quiz[i].answer).length}/{session.quiz.length}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={() => setQuizAnswers(session.quiz.map(() => null))}>
                Làm lại
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ---------- Tab Bài kiểm tra ---------- */}
      {tab === "test" && (
        <div>
          {mcItem?.kind === "quiz" && (
            <Card className="p-4 mb-4">
              <p className="font-bold mb-3">1. {mcItem.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {mcItem.options.map((opt, oi) => {
                  let state: "idle" | "correct" | "wrong" | "muted" = "idle";
                  if (testPick !== null) {
                    if (oi === mcItem.answer) state = "correct";
                    else if (oi === testPick) state = "wrong";
                    else state = "muted";
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={cn(
                        "min-h-[52px] rounded-control border px-3 py-2 text-sm text-left bg-surface-elevated text-text-primary transition-colors",
                        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
                        answerCls(state),
                      )}
                      disabled={writtenGraded}
                      onClick={() => setTestPick(oi)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {testPick !== null && (
                <p className={cn("text-xs mt-2 font-semibold", testPick === mcItem.answer ? "text-feedback-success" : "text-text-primary")}>
                  {testPick === mcItem.answer ? "Đúng! " : "Chưa đúng. "}
                  {mcItem.explain}
                </p>
              )}
            </Card>
          )}

          {essayItem?.kind === "written" && (
            <Card className="p-4 mb-4">
              <p className="font-bold mb-2">2. {essayItem.q}</p>
              <input
                type="text"
                className="w-full rounded-control border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-3 ring-action-focus ring-offset-2 disabled:opacity-50"
                placeholder="Nhập pinyin (kèm dấu thanh)…"
                value={essay}
                disabled={writtenGraded}
                onChange={(e) => setEssay(e.target.value)}
              />
              {writtenGraded && (
                <p className={cn("text-xs mt-2 font-semibold", writtenCorrect ? "text-feedback-success" : "text-text-primary")}>
                  {writtenCorrect ? "Đúng! " : `Chưa đúng — đáp án: ${essayItem.accept[0]}. `}
                </p>
              )}
            </Card>
          )}

          {!writtenGraded ? (
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                onClick={() => {
                  if (testPick === null) {
                    toast("Hãy chọn đáp án câu trắc nghiệm trước khi nộp bài");
                    return;
                  }
                  setWrittenGraded(true);
                }}
              >
                Nộp bài
              </Button>
            </div>
          ) : (
            <p className="text-lg font-extrabold mb-2">Điểm: {testScore}/2</p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={testScore < 1}
              onClick={() => {
                progressStore.markRoadmapSession(n);
                toast(`Chúc mừng! Bạn đã hoàn thành Buổi ${n}`);
                router.push("/roadmap/pinyin");
              }}
            >
              Hoàn thành buổi {n} →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
