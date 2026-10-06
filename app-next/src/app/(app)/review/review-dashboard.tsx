"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { progressStore } from "@/lib/store/progress-store";
import { buildQueue, srsLevelFromKey, resolveWord, type ReviewableWord } from "@/lib/srs-session";
import { captureWrong } from "@/lib/notebook/capture";
import { memTone } from "@/lib/stats/review";
import type { BucketData } from "@/components/review/srs-buckets";
import { MemoryHero } from "@/components/review/memory-hero";
import { SrsBuckets } from "@/components/review/srs-buckets";
import { VocabInspector } from "@/components/review/vocab-inspector";
import { SrsSession } from "@/components/review/srs-session";
import { StrokeStudio } from "@/components/review/stroke-studio";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Card } from "@/components/ui/card";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";

/* Review redesign (spec 2026-10-04) — compose hero/buckets/inspector/session/studio.
   mounted-gate + tick bye:progress như dashboard cũ; session giữ snapshot queue. */

const LEVELS = ["HSK 1", "HSK 2", "HSK 3"] as const;

function bucketize(words: ReviewableWord[]): { weak: BucketData; cons: BucketData; mast: BucketData } {
  const weak: BucketData = { count: 0, words: [] };
  const cons: BucketData = { count: 0, words: [] };
  const mast: BucketData = { count: 0, words: [] };
  for (const w of words) {
    /* Ngưỡng độ bền lấy từ memTone() để không trôi khỏi bảng tone ở lib/stats/review. */
    const tone = memTone(w.mem);
    const b = tone === "weak" ? weak : tone === "mid" ? cons : mast;
    b.count += 1;
    if (b.words.length < 3) b.words.push({ zh: w.zh, key: w.key });
  }
  return { weak, cons, mast };
}

export default function ReviewDashboard() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [level, setLevel] = useState<string>("HSK 2");
  const [queue, setQueue] = useState<ReviewableWord[]>([]);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [strokeWord, setStrokeWord] = useState<string | null>(null);
  const { speak } = useTts();
  const toast = useToastSafe();

  useEffect(() => {
    setMounted(true);
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);

  const now = Date.now();
  const srs = mounted ? progressStore.getAllSrs() : [];
  const words = mounted ? buildQueue(srs, level, now) : [];
  const { weak, cons, mast } = bucketize(words);
  const avgMem = words.length ? Math.round(words.reduce((s, w) => s + w.mem, 0) / words.length) : 0;
  const dueCount = srs.filter(
    (it) => srsLevelFromKey(it.key) === level && it.status !== "known" && it.dueAt != null && it.dueAt <= now
  ).length;
  const estMinutes = Math.max(1, Math.ceil(dueCount / 3)); // ~20 giây/từ
  const urgent = weak.count;
  // tick chỉ ép re-render qua store event; không render giá trị (giữ lint sạch như bản cũ)
  void tick;

  const startSession = () => {
    if (words.length === 0) {
      toast(`Chưa có từ đến hạn ở ${level}`);
      return;
    }
    setQueue(words);
    setSessionOpen(true);
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <SegmentedTabs
        label="Lọc cấp độ HSK"
        value={level}
        onChange={setLevel}
        tabs={LEVELS.map((l) => ({ key: l, label: l }))}
        className="self-start"
      />

      <MemoryHero
        count={words.length}
        avgMem={avgMem}
        estMinutes={estMinutes}
        urgent={urgent}
        emptyQueue={dueCount === 0}
        onStart={startSession}
      />

      <SrsBuckets weak={weak} cons={cons} mast={mast} onChipClick={(zh) => speak(zh)} />

      {srs.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="mb-2 text-xl font-extrabold tracking-tight">Bộ thẻ đang trống</h2>
          <p className="mb-4 text-text-secondary">
            Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.
          </p>
          <Link href="/course" className="font-bold text-action-primary hover:underline">
            Vào kệ sách →
          </Link>
        </Card>
      ) : (
        <VocabInspector words={words} onListen={(zh) => speak(zh)} onStroke={(zh) => setStrokeWord(zh)} />
      )}

      {sessionOpen && (
        <SrsSession
          words={queue}
          onGrade={(key, grade) => {
            progressStore.recordReview(key, grade);
            // auto-capture từ quên khi ôn SRS (spec §3.4.3) — resolve word tại chỗ gọi
            if (grade === "forgot") {
              const word = resolveWord(key);
              if (word) {
                captureWrong({
                  q: `${word.zh} nghĩa là gì?`,
                  wrong: null,
                  right: { zh: word.zh, py: word.pinyin },
                  cause: "Quên khi ôn SRS — từ sẽ quay lại sớm.",
                  hsk: /^hsk(\d+)\./.test(key) ? `HSK${key.match(/^hsk(\d+)\./)![1]}` : undefined,
                });
              }
            }
          }}
          onExit={(score, total) => {
            setSessionOpen(false);
            toast(`Xong phiên ôn: ${score}/${total} từ nhớ tốt`);
          }}
        />
      )}

      {strokeWord && <StrokeStudio word={strokeWord} onClose={() => setStrokeWord(null)} />}
    </div>
  );
}
