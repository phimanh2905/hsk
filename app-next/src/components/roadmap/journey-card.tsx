"use client";

/* JourneyCard (E1) — card "Hành trình của bạn" trên trang /roadmap.
   Port từ clone/roadmap.html + SPEC-05 §1: "Bạn đang ở: 拼音 · Bảng chữ cái Pinyin"
   + nút "Tiếp tục học" → /roadmap/pinyin + progress bar % toàn lộ trình
   (% = getRoadmapDone().length / 8 — tiến độ chặng pinyin).
   SSG-safe: chỉ đọc localStorage sau mount như ContinueCard. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { roadmapCopy } from "@/content/roadmap";
import { progressStore } from "@/lib/store/progress-store";
import { Card } from "@/components/ui/card";

const PINYIN_TOTAL_SESSIONS = 8;

const LINK_BTN =
  "inline-flex items-center justify-center rounded-control border font-semibold min-h-11 px-4 text-sm " +
  "bg-action-primary text-white border-transparent hover:bg-action-primary-hover active:bg-action-primary-active " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

export default function JourneyCard(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    setDoneCount(progressStore.getRoadmapDone().length);
  }, []);

  /* Trước mount (SSR/SSG): 0% — mặc định an toàn, SP1 thường 0%. */
  const percent = mounted ? Math.floor((doneCount / PINYIN_TOTAL_SESSIONS) * 100) : 0;

  return (
    <Card className="p-5 mb-8">
      <h2 className="text-lg font-extrabold mb-3">{roadmapCopy.yourJourney}</h2>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="font-semibold">
          Bạn đang ở: <span className="zh text-action-primary font-extrabold">拼音</span> · Bảng chữ cái Pinyin
        </p>
        <Link href="/roadmap/pinyin" className={`${LINK_BTN} ml-auto`}>
          {roadmapCopy.continueCta}
        </Link>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs font-bold mb-1">
          <span className="text-text-secondary">Tiến độ</span>
          <span>{percent}% toàn lộ trình</span>
        </div>
        <div
          role="progressbar"
          aria-label="Tiến độ toàn lộ trình"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 rounded-full bg-border-subtle overflow-hidden"
        >
          <div className="h-full bg-action-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </Card>
  );
}
