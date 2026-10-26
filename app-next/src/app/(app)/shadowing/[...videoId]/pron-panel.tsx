"use client";
/* PronPanel — mode Phát âm (Task 9, spec WSD.5): transcript thu gọn của câu active
   (hanzi to + pinyin + vi) + ghi âm chấm điểm heuristic. Dùng lại useRecorder +
   scoreFor như record dock của studio; KHÔNG dùng SpeechRecognition. */
import { useState } from "react";
import { useRecorder } from "@/lib/shadowing/use-recorder";
import { scoreFor } from "@/lib/shadowing/scoring";
import { Button } from "@/components/ui/button";
import { Mic, Square, ICON_STROKE } from "@/components/ui/icon";
import type { SubtitleSentence } from "@/content/shadowing";

export default function PronPanel({ subs, cur, rate, videoId, recordPractice }: {
  subs: SubtitleSentence[]; cur: number; rate: number; videoId: string;
  recordPractice: (id: string, patch: { score?: number; secondsDelta?: number; linesDoneDelta?: number }) => void;
}) {
  const [level, setLevel] = useState(0);
  const rec = useRecorder(setLevel);
  const [score, setScore] = useState<number | null>(null);
  const curSub = subs[Math.min(cur, subs.length - 1)] ?? subs[0];
  const zh = curSub ? curSub.parts.map((p) => p.zh).join(" ") : "";

  function toggle() {
    if (rec.recording) {
      const r = rec.stop();
      if (!r) return;
      const s = scoreFor(r.secs, zh.length, rate, rec.simMode);
      setScore(s);
      recordPractice(videoId, { score: s, secondsDelta: Math.round(r.secs), linesDoneDelta: 1 });
    } else {
      setScore(null);
      rec.start();
    }
  }

  return (
    <div data-testid="pron-box" data-od-id="pron-box" className="mt-3 space-y-3">
      {/* hàng tiêu đề — "Câu n/N" */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-extrabold tracking-wide">CÂU {cur + 1} / {subs.length}</p>
        <small className="text-xs italic text-text-secondary">{curSub?.vi}</small>
      </div>

      {/* transcript thu gọn: hanzi to + pinyin */}
      <div className="rounded-2xl border border-border-subtle bg-surface-muted p-3.5">
        <p data-testid="pron-zh" className="zh text-2xl font-bold leading-relaxed">{zh}</p>
        <p data-testid="pron-py" className="mt-1.5 text-sm italic text-text-secondary">{curSub?.pinyin}</p>
      </div>

      {/* ghi âm chấm điểm */}
      <div className="flex items-center gap-3">
        <Button
          variant={rec.recording ? "danger" : "primary"}
          data-testid="pron-record"
          onClick={toggle}
          className="min-w-28"
        >
          {rec.recording ? <Square size={14} strokeWidth={ICON_STROKE} /> : <Mic size={14} strokeWidth={ICON_STROKE} />}
          {rec.recording ? "DỪNG" : "THU ÂM"}
        </Button>
        {/* level bar nhỏ khi đang thu */}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-action-primary transition-[width] duration-100"
            style={{ width: rec.recording ? Math.round(level * 100) + "%" : "0%" }}
          />
        </div>
        {score !== null && (
          <span
            data-testid="pron-score"
            className="rounded-control bg-jade-wash px-2.5 py-1 text-sm font-extrabold text-feedback-success tabular-nums"
          >
            {score}%
          </span>
        )}
      </div>

      <p data-testid="pron-tip" className="text-xs text-text-secondary">
        Nói rõ từng âm tiết — nghe mẫu rồi nhại theo nhịp.{rec.simMode ? " (Chế độ mô phỏng — không có micro)" : ""}
      </p>
    </div>
  );
}
