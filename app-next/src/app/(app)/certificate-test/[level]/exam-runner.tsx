"use client";

/* W6.3 — Runner đề thi demo: chạy tuần tự theo section; choice/cloze chọn
   option, free dán câu trả lời (chấm bằng gradeFreeAnswer khi nộp).
   Audio chưa render (Wave 3 Kokoro) → câu nghe hiện dòng italic nhắc nhở.
   Kết thúc: hiện tổng điểm + breakdown; nếu đã đăng nhập thì POST kết quả lên
   /api/v1/exam/results (guest chỉ xem điểm). */

import { useState } from "react";
import type { Exam, ExamSectionResult } from "@/lib/exam/types";
import { gradeFreeAnswer } from "@/lib/exam/grade";
import { useSession } from "@/lib/use-session";

type FreeState = { selected: string | null; free: string };

const NO_AUDIO_HINT = "Audio sẽ có ở bản cập nhật tiếp theo";

export default function ExamRunner({ exam }: { exam: Exam }) {
  const { loggedIn } = useSession();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, FreeState>>({});
  const [graded, setGraded] = useState<ExamSectionResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [posted, setPosted] = useState<"idle" | "sending" | "ok" | "error">("idle");

  const section = exam.sections[sectionIdx];

  async function setAnswer(qIdx: number, patch: Partial<FreeState>) {
    setAnswers((prev) => ({ ...prev, [qIdx]: { ...(prev[qIdx] ?? { selected: null, free: "" }), ...patch } }));
  }

  function gradeSection(): { score: number; max: number } {
    let score = 0;
    section.questions.forEach((q, i) => {
      const flatIdx = sectionIdx * 100 + i; // key duy nhất per section+question
      const a = answers[flatIdx];
      if (q.kind === "free") {
        if (a && gradeFreeAnswer(a.free, q.sampleAnswer).correct) score += 1;
      } else if (a?.selected === q.answer) {
        score += 1;
      }
    });
    return { score, max: section.questions.length };
  }

  async function submitSection() {
    const { score, max } = gradeSection();
    const nextSections: ExamSectionResult[] = [
      ...graded.filter((s) => s.section !== section.kind),
      { section: section.kind, score, maxScore: max },
    ];
    setGraded(nextSections);
    if (sectionIdx + 1 < exam.sections.length) {
      setSectionIdx(sectionIdx + 1);
      return;
    }
    setFinished(true);
    if (loggedIn) {
      setPosted("sending");
      try {
        const res = await fetch("/api/v1/exam/results", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            level: exam.level,
            totalScore: nextSections.reduce((n, s) => n + s.score, 0),
            maxScore: nextSections.reduce((n, s) => n + s.maxScore, 0),
            sections: nextSections,
          }),
        });
        setPosted(res.ok ? "ok" : "error");
      } catch {
        setPosted("error");
      }
    }
  }

  function retry() {
    setSectionIdx(0);
    setAnswers({});
    setGraded([]);
    setFinished(false);
    setPosted("idle");
  }

  if (finished) {
    const total = graded.reduce((n, s) => n + s.score, 0);
    const max = graded.reduce((n, s) => n + s.maxScore, 0);
    return (
      <div className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-6" data-testid="exam-result">
        <h3 className="text-lg font-bold">
          Kết quả: <span data-score>{total}</span>/{max} điểm
        </h3>
        <ul className="mt-3 space-y-1 text-sm">
          {graded.map((s) => (
            <li key={s.section} className="flex justify-between gap-4">
              <span className="capitalize text-text-secondary">{s.section}</span>
              <span className="font-semibold">
                {s.score}/{s.maxScore}
              </span>
            </li>
          ))}
        </ul>
        {posted === "ok" && <p className="mt-3 text-sm text-text-secondary">Kết quả đã được lưu vào lịch sử của bạn.</p>}
        {posted === "error" && <p className="mt-3 text-sm text-text-secondary">Không lưu được kết quả lên server.</p>}
        <button
          type="button"
          data-retry
          onClick={retry}
          className="mt-4 rounded-control bg-action-primary px-4 py-2 text-sm font-semibold text-text-on-action focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
        >
          Thi lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="exam-runner">
      <div>
        <p className="text-sm text-text-secondary">
          Phần {sectionIdx + 1}/{exam.sections.length}
        </p>
        <h3 className="text-lg font-bold">{section.title}</h3>
      </div>
      <ol className="space-y-6">
        {section.questions.map((q, i) => {
          const key = sectionIdx * 100 + i;
          const a = answers[key];
          return (
            <li key={i} className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-4">
              <p className="text-sm font-semibold">
                Câu {i + 1}.{" "}
                {q.kind === "choice" && q.prompt}
                {q.kind === "cloze" && q.sentenceWithBlank}
                {q.kind === "free" && q.prompt}
              </p>
              {section.kind === "listening" &&
                q.kind !== "free" &&
                (q.audio ? (
                  <audio controls src={q.audio.audioUrl} className="mt-2" data-testid={`audio-${i}`} />
                ) : (
                  <p className="mt-2 text-xs italic text-text-secondary">{NO_AUDIO_HINT}</p>
                ))}
              {(q.kind === "choice" || q.kind === "cloze") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      data-option
                      data-selected={a?.selected === opt || undefined}
                      onClick={() => setAnswer(key, { selected: opt })}
                      className={`rounded-control border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 ${
                        a?.selected === opt
                          ? "border-action-primary bg-action-primary/10 font-semibold"
                          : "border-border-default bg-surface-paper"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.kind === "free" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    data-free
                    rows={2}
                    value={a?.free ?? ""}
                    onChange={(e) => setAnswer(key, { free: e.target.value })}
                    className="w-full rounded-control border border-border-default bg-surface-paper px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
                    placeholder="Nhập câu trả lời bằng chữ Hán"
                  />
                  <details className="text-xs text-text-secondary">
                    <summary>Gợi ý</summary>
                    <p data-sample={i}>{q.sampleAnswer}</p>
                  </details>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        data-submit-section
        onClick={submitSection}
        className="rounded-control bg-action-primary px-4 py-2 text-sm font-semibold text-text-on-action focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      >
        {sectionIdx + 1 < exam.sections.length ? "Nộp phần này" : "Nộp bài"}
      </button>
    </div>
  );
}
