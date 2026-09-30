"use client";

/* SessionClient (E3) — trang buổi học lộ trình pinyin, port clone/js/roadmap-session.js
   + SPEC-21 §B–C: 4 tab Học ✓ / Flashcard / Trắc nghiệm / Bài kiểm tra, unlock tuần tự.
   Tab Bài kiểm tra gated bởi sessionStatus(getRoadmapDone(), n) (Task 26);
   hoàn thành → progressStore.markRoadmapSession(n) (Task 6) → timeline mở buổi kế. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roadmapSessions } from "@/content/roadmap";
import { progressStore } from "@/lib/store/progress-store";
import { sessionStatus } from "@/lib/roadmap-status";
import { checkTyped } from "@/components/lesson/modes/typing";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";

type Tab = "learn" | "flash" | "quiz" | "test";
const TABS: Tab[] = ["learn", "flash", "quiz", "test"];
const TAB_LABELS: Record<Tab, string> = {
  learn: "Học",
  flash: "Flashcard",
  quiz: "Trắc nghiệm",
  test: "Bài kiểm tra",
};
const LEARN_SEEN_KEY = "nhai.roadmap.learnSeen";

function readLearnSeen(): number[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LEARN_SEEN_KEY) || "[]") as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function markLearnSeen(n: number): void {
  try {
    const seen = readLearnSeen();
    if (!seen.includes(n)) {
      seen.push(n);
      localStorage.setItem(LEARN_SEEN_KEY, JSON.stringify(seen));
    }
  } catch {
    /* silent */
  }
}

export default function SessionClient({ n }: { n: number }): React.JSX.Element {
  const session = roadmapSessions[n - 1];
  const router = useRouter();
  const toast = useToastSafe();
  const { speak } = useTts();

  const [tab, setTab] = useState<Tab>("learn");
  const [learnSeen, setLearnSeen] = useState<number[]>(() => readLearnSeen());

  const [fcIndex, setFcIndex] = useState(0);
  const [fcKnown, setFcKnown] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(() => session.quiz.map(() => null));

  const [testPick, setTestPick] = useState<number | null>(null);
  const [essay, setEssay] = useState("");
  const [writtenGraded, setWrittenGraded] = useState(false);

  const locked = sessionStatus(progressStore.getRoadmapDone(), n) === "locked";

  const mcItem = session.test.find((x) => x.kind === "quiz");
  const essayItem = session.test.find((x) => x.kind === "written");
  const writtenCorrect =
    writtenGraded && essayItem?.kind === "written" ? checkTyped(essay, essayItem.accept[0]) : false;
  const testScore = (testPick !== null && mcItem?.kind === "quiz" && testPick === mcItem.answer ? 1 : 0) + (writtenCorrect ? 1 : 0);

  function switchTab(t: Tab): void {
    if (t === "test" && locked) {
      toast("Bài kiểm tra chỉ mở khi bạn đã hoàn thành buổi trước 🔒");
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
      <Link href="/roadmap/pinyin" className="text-sm font-bold text-nhai-main hover:underline">
        ‹ Lộ trình pinyin
      </Link>
      <h2 className="text-2xl font-extrabold tracking-tight mt-1">Buổi {n} — {session.title}</h2>
      <p className="text-sm text-nhai-muted mt-1 mb-3">
        ⏱ {session.minutes} phút · {session.desc}
      </p>

      {/* Progress bar mỏng: tab hiện tại /4 */}
      <div className="h-1 w-full bg-nhai-border rounded-full mb-4" role="progressbar" aria-label="Tiến trình buổi học">
        <div
          className="h-1 bg-nhai-main rounded-full transition-all"
          style={{ width: `${((tabIdx + 1) / TABS.length) * 100}%` }}
        />
      </div>

      {/* 4 tab pill */}
      <div className="flex flex-wrap gap-2 mb-5" role="tablist">
        {TABS.map((t) => {
          const label =
            TAB_LABELS[t] +
            (t === "learn" && learnSeen.includes(n) ? " ✓" : "") +
            (t === "test" && locked ? " 🔒" : "");
          const cls =
            t === tab
              ? "pill pill-active border-2 border-nhai-main"
              : t === "test" && locked
                ? "pill opacity-60 cursor-not-allowed"
                : "pill";
          return (
            <button
              key={t}
              type="button"
              aria-pressed={t === tab}
              className={`${cls} px-4 py-2 text-sm font-bold`}
              onClick={() => switchTab(t)}
            >
              {label}
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
                  <div key={t.tone} className="card shadow-neo p-4 flex flex-col items-center text-center gap-1">
                    <span className="text-4xl font-extrabold">{t.tone}</span>
                    <span className="text-xs font-bold text-nhai-main uppercase tracking-wide">{t.name}</span>
                    <span className="text-sm text-nhai-muted">{t.detail}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="zh text-2xl font-bold">{t.ex.hanzi}</span>
                      <span className="text-sm font-semibold">{t.ex.pinyin}</span>
                      <span className="text-xs text-nhai-muted">{t.ex.meaning}</span>
                      <button
                        type="button"
                        className="btn-ghost w-9 h-9 text-sm shrink-0"
                        title="Nghe phát âm"
                        onClick={() => speak(t.ex!.pinyin.replace(/\s/g, ""), { rate: 0.8 })}
                      >
                        🔊
                      </button>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {session.learn.map((t) => (
                <div key={t.title ?? t.detail} className="card shadow-neo p-4">
                  <h4 className="font-extrabold mb-1">{t.title}</h4>
                  <p className="text-sm text-nhai-muted">{t.detail}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bảng "Tự nhận biết" 2 cột */}
          <div className="card shadow-neo p-4 mb-4">
            <h4 className="font-extrabold mb-2">Tự nhận biết</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-nhai-muted uppercase">
                  <th className="py-1 pr-2">Chữ</th>
                  <th className="py-1">Pinyin · nghĩa</th>
                </tr>
              </thead>
              <tbody>
                {session.cards.map((c) => (
                  <tr key={c.hanzi + c.pinyin} className="border-t border-nhai-border">
                    <td className="py-2 pr-2">
                      <span className="zh text-xl font-bold">{c.hanzi}</span>
                    </td>
                    <td className="py-2">
                      <span className="font-semibold">{c.pinyin}</span>{" "}
                      <span className="text-xs text-nhai-muted">({c.hv})</span> — {c.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-main px-5 py-2.5 text-sm font-bold"
              onClick={() => {
                markLearnSeen(n);
                setLearnSeen(readLearnSeen());
                switchTab("flash");
              }}
            >
              Đã đọc xong, sang thẻ ghi nhớ →
            </button>
          </div>
        </div>
      )}

      {/* ---------- Tab Flashcard ---------- */}
      {tab === "flash" && (
        <div>
          {fcIndex >= session.cards.length ? (
            <div className="card shadow-neo p-8 text-center">
              <p className="text-lg font-extrabold mb-2">Đã ôn {fcKnown}/{session.cards.length} thẻ ✓</p>
              <p className="text-sm text-nhai-muted mb-4">
                Lật từng thẻ để tự kiểm tra — bấm “Đã thuộc” khi nhớ, “Chưa thuộc” để ôn lại sau.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className="btn-ghost px-5 py-2 text-sm font-bold"
                  onClick={() => {
                    setFcIndex(0);
                    setFcKnown(0);
                    setFlipped(false);
                  }}
                >
                  Ôn lại từ đầu
                </button>
                <button
                  type="button"
                  className="btn-main px-5 py-2 text-sm font-bold"
                  onClick={() => switchTab("quiz")}
                >
                  Sang Trắc nghiệm →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-center text-xs font-bold text-nhai-muted mb-2">
                {fcIndex + 1}/{session.cards.length} thẻ
              </p>
              <button
                type="button"
                className="card shadow-neo w-full p-8 text-center min-h-[10rem] flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow"
                title="Bấm để lật thẻ"
                onClick={() => setFlipped((f) => !f)}
              >
                {flipped ? (
                  <>
                    <span className="text-2xl font-extrabold text-nhai-main">{session.cards[fcIndex].pinyin}</span>
                    <span className="text-xs text-nhai-muted">({session.cards[fcIndex].hv})</span>
                    <span className="text-lg font-bold">{session.cards[fcIndex].meaning}</span>
                  </>
                ) : (
                  <>
                    <span className="zh text-5xl font-extrabold">{session.cards[fcIndex].hanzi}</span>
                    <span className="text-xs text-nhai-muted">Bấm để xem pinyin &amp; nghĩa</span>
                  </>
                )}
              </button>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  className="btn-ghost px-5 py-2 text-sm font-bold"
                  onClick={() => {
                    setFlipped(false);
                    setFcIndex((i) => i + 1);
                  }}
                >
                  Chưa thuộc
                </button>
                <button
                  type="button"
                  className="btn-main px-5 py-2 text-sm font-bold"
                  onClick={() => {
                    setFlipped(false);
                    setFcKnown((k) => k + 1);
                    setFcIndex((i) => i + 1);
                  }}
                >
                  Đã thuộc
                </button>
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
              <div key={q.q} className="card shadow-neo p-4 mb-4">
                <p className="font-bold mb-3">{qi + 1}. {q.q}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => {
                    let cls = "border-2 rounded-lg px-3 py-2 text-sm text-left";
                    if (a !== null) {
                      if (oi === q.answer) cls += " border-green-600 bg-green-50 font-bold";
                      else if (oi === a) cls += " border-nhai-main bg-red-50";
                      else cls += " border-nhai-border opacity-60";
                    } else {
                      cls += " border-nhai-border hover:border-nhai-main cursor-pointer";
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={cls}
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
                  <p className={`text-xs mt-2 font-semibold ${a === q.answer ? "text-green-700" : "text-nhai-main"}`}>
                    {a === q.answer ? "Đúng! " : "Chưa đúng. "}
                    {q.explain}
                  </p>
                )}
              </div>
            );
          })}
          {quizAnswers.some((a) => a !== null) && (
            <div className="card shadow-neo p-4 flex items-center justify-between gap-3">
              <p className="font-extrabold">
                Đúng {quizAnswers.filter((a, i) => a === session.quiz[i].answer).length}/{session.quiz.length}
              </p>
              <button
                type="button"
                className="btn-ghost px-4 py-2 text-sm font-bold"
                onClick={() => setQuizAnswers(session.quiz.map(() => null))}
              >
                Làm lại
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab Bài kiểm tra ---------- */}
      {tab === "test" && (
        <div>
          {mcItem?.kind === "quiz" && (
            <div className="card shadow-neo p-4 mb-4">
              <p className="font-bold mb-3">1. {mcItem.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {mcItem.options.map((opt, oi) => {
                  let cls = "border-2 rounded-lg px-3 py-2 text-sm text-left";
                  if (testPick !== null) {
                    if (oi === mcItem.answer) cls += " border-green-600 bg-green-50 font-bold";
                    else if (oi === testPick) cls += " border-nhai-main bg-red-50";
                    else cls += " border-nhai-border opacity-60";
                  } else {
                    cls += testPick === oi
                      ? " border-nhai-main bg-nhai-soft"
                      : " border-nhai-border hover:border-nhai-main cursor-pointer";
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={cls}
                      disabled={writtenGraded}
                      onClick={() => setTestPick(oi)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {testPick !== null && (
                <p className={`text-xs mt-2 font-semibold ${testPick === mcItem.answer ? "text-green-700" : "text-nhai-main"}`}>
                  {testPick === mcItem.answer ? "Đúng! " : "Chưa đúng. "}
                  {mcItem.explain}
                </p>
              )}
            </div>
          )}

          {essayItem?.kind === "written" && (
            <div className="card shadow-neo p-4 mb-4">
              <p className="font-bold mb-2">2. {essayItem.q}</p>
              <input
                type="text"
                className="w-full border-2 border-nhai-border rounded-lg px-3 py-2 text-sm bg-white text-nhai-ink"
                placeholder="Nhập pinyin (kèm dấu thanh)…"
                value={essay}
                disabled={writtenGraded}
                onChange={(e) => setEssay(e.target.value)}
              />
              {writtenGraded && (
                <p className={`text-xs mt-2 font-semibold ${writtenCorrect ? "text-green-700" : "text-nhai-main"}`}>
                  {writtenCorrect ? "Đúng! " : `Chưa đúng — đáp án: ${essayItem.accept[0]}. `}
                </p>
              )}
            </div>
          )}

          {!writtenGraded ? (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                className="btn-main px-5 py-2.5 text-sm font-bold"
                onClick={() => {
                  if (testPick === null) {
                    toast("Hãy chọn đáp án câu trắc nghiệm trước khi nộp bài");
                    return;
                  }
                  setWrittenGraded(true);
                }}
              >
                Nộp bài
              </button>
            </div>
          ) : (
            <p className="text-lg font-extrabold mb-2">Điểm: {testScore}/2</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-main px-5 py-2.5 text-sm font-bold"
              disabled={testScore < 1}
              onClick={() => {
                progressStore.markRoadmapSession(n);
                toast(`Chúc mừng! Bạn đã hoàn thành Buổi ${n} 🎉`);
                router.push("/roadmap/pinyin");
              }}
            >
              Hoàn thành buổi {n} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
