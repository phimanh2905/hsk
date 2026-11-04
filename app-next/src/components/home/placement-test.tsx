"use client";

/* Runner bài test trình độ (spec 2026-11-04 §4): ladder từng block, dừng khi fail.
   Tách khỏi exam-runner: không lưu D1, không sections nghe/viết. */

import { useEffect, useMemo, useState } from "react";
import { X } from "@/components/ui/icon";
import { loadVocab } from "@/lib/content/vocab-client";
import type { VocabData } from "@/lib/content/vocab";
import {
  generatePlacementBlocks, placementSuggestedStage, PLACEMENT_LEVELS, PLACEMENT_PASS,
  type PlacementBlock, type PlacementStage,
} from "@/lib/exam/placement";
import type { PlacementBlocks, StageId } from "@/lib/store/progress-store";

export type PlacementResult = { suggestedStage: StageId; blocks: PlacementBlocks; seed: number };

const BTN_OPTION =
  "min-h-12 w-full rounded-control border border-border-default bg-surface-elevated px-4 py-3 text-left text-[15px] font-medium text-text-primary hover:bg-surface-muted hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus disabled:opacity-60 disabled:pointer-events-none";

export default function PlacementTest({ onComplete, onCancel }: {
  onComplete: (r: PlacementResult) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<VocabData | null>(null);
  const [error, setError] = useState(false);
  const [answeredQi, setAnsweredQi] = useState<number | null>(null); // câu đã trả lời (double-click guard)
  const [qi, setQi] = useState(0); // index câu toàn cục qua các block
  const [blocks, setBlocks] = useState<PlacementBlocks>({});
  const seed = useMemo(() => Date.now(), []);

  useEffect(() => {
    loadVocab().then(setData).catch(() => setError(true));
  }, []);

  const gen = useMemo<{ blocks: PlacementBlock[]; failed: boolean }>(() => {
    if (!data) return { blocks: [], failed: false };
    try {
      return { blocks: generatePlacementBlocks(data, seed), failed: false };
    } catch {
      return { blocks: [], failed: true };
    }
  }, [data, seed]);
  const allBlocks = gen.blocks;
  const flat = useMemo(() => allBlocks.flatMap((b) => b.questions.map((q) => ({ ...q, blockLevel: b.level }))), [allBlocks]);
  const answered = answeredQi === qi;

  if (error || gen.failed) {
    return (
      <div data-testid="placement-error" className="rounded-card border border-border-default bg-surface-elevated p-5 text-[14px] text-text-secondary">
        Không tải được dữ liệu test. <button onClick={onCancel} className="font-bold text-action-primary underline">Quay lại</button>
      </div>
    );
  }
  if (!data) return null;

  const q = flat[qi];
  const levelOf = PLACEMENT_LEVELS[Math.min(PLACEMENT_LEVELS.length - 1, Math.floor(qi / 3))] as PlacementStage;

  const answer = (i: number) => {
    if (answered) return; // chặn double-click
    setAnsweredQi(qi);
    const correct = q.options[i] === q.answer;
    const cur = blocks[q.blockLevel] ?? { correct: 0, total: 3 };
    const next = { ...cur, correct: cur.correct + (correct ? 1 : 0) };
    const nextBlocks = { ...blocks, [q.blockLevel]: next };
    const isLastOfBlock = qi % 3 === 2;
    if (isLastOfBlock && next.correct < PLACEMENT_PASS) {
      // fail block → dừng ladder, xuất kết quả
      onComplete({ suggestedStage: placementSuggestedStage(nextBlocks), blocks: nextBlocks, seed });
      return;
    }
    if (qi + 1 >= flat.length) {
      onComplete({ suggestedStage: placementSuggestedStage(nextBlocks), blocks: nextBlocks, seed });
      return;
    }
    setBlocks(nextBlocks);
    setQi(qi + 1);
  };

  return (
    <div className="rounded-card border border-border-default bg-surface-elevated p-5 md:p-6">
      <div className="flex items-center justify-between">
        <p data-testid="placement-progress" className="text-[12px] font-bold uppercase tracking-[0.08em] text-text-secondary">
          {levelOf.toUpperCase()} · Câu {qi + 1}/15
        </p>
        <button onClick={onCancel} data-testid="placement-cancel" aria-label="Thoát test"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted">
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-action-primary" style={{ width: `${Math.round(((qi + 1) / 15) * 100)}%` }} />
      </div>
      <p data-testid="placement-question" className="zh mt-5 text-lg font-bold leading-relaxed">
        {q.prompt}
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        {q.options.map((opt, i) => (
          <button key={i} data-testid="placement-option" data-correct={opt === q.answer ? "true" : "false"}
            onClick={() => answer(i)} disabled={answered} className={BTN_OPTION}>
            <span className="zh">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
