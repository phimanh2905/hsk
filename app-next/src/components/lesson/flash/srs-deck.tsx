"use client";

/* Deck chấm điểm SRS (port div[data-od-id="srs-deck"] của opendesign lesson.html):
   nút reveal 56px ⇄ 3 nút grade (rose / amber / primary) có hotkey badge. */

import { useLesson } from "../lesson-provider";
import { Kbd } from "./kbd";
import { cn } from "@/lib/cn";

type GradeDef = {
  level: 1 | 2 | 3;
  label: string;
  sub: string;
  hotkey: string;
  odId: string;
  tone: string;
};

const GRADES: GradeDef[] = [
  {
    level: 1,
    label: "Chưa thuộc",
    sub: "Ôn lại sau 1 phút",
    hotkey: "1",
    odId: "grade-again",
    tone: "bg-rose-wash border-rose-line text-rose-ink",
  },
  {
    level: 2,
    label: "Mơ hồ · Khó",
    sub: "Ôn lại sau 5 phút",
    hotkey: "2",
    odId: "grade-hard",
    tone: "bg-amber-wash border-[color-mix(in_srgb,var(--hz-amber)_40%,transparent)] text-amber-ink",
  },
  {
    level: 3,
    label: "Đã thuộc · Tốt",
    sub: "Chuyển từ tiếp theo",
    hotkey: "3",
    odId: "grade-good",
    tone: "bg-action-primary border-action-primary text-white shadow-[0_4px_12px_rgba(200,60,50,.25)] hover:bg-action-primary-hover hover:border-action-primary-hover",
  },
];

export function SrsDeck({ className }: { className?: string }) {
  const { revealed, setRevealed, grade, done } = useLesson();

  // màn completion ẩn cả reveal lẫn grades (port mockup: revealBtn.hidden = true)
  if (done) return null;

  if (!revealed) {
    return (
      <button
        type="button"
        data-od-id="reveal-button"
        onClick={() => setRevealed(true)}
        className={cn(
          "flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[16px] border border-border-default bg-surface-muted text-sm font-bold text-text-primary transition hover:brightness-[.97] active:scale-[.99] focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
          className,
        )}
      >
        Chạm để xem nghĩa &amp; ví dụ
        <Kbd>Space</Kbd>
      </button>
    );
  }

  return (
    <div data-od-id="srs-deck" className={cn("grid grid-cols-3 gap-2.5 max-[480px]:grid-cols-1", className)}>
      {GRADES.map((g) => (
        <button
          key={g.level}
          type="button"
          data-grade={g.level}
          data-od-id={g.odId}
          onClick={() => grade(g.level)}
          className={cn(
            "relative flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-[16px] border px-2 py-3 text-[13.5px] font-bold transition hover:brightness-[.97] active:scale-[.99] focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
            g.tone,
          )}
        >
          <span
            aria-hidden="true"
            className="absolute right-2 top-1.5 rounded border border-current px-1 text-[10px] font-extrabold leading-[1.5] opacity-55"
          >
            {g.hotkey}
          </span>
          {g.label}
          <small className="text-[11.5px] font-normal opacity-90">{g.sub}</small>
        </button>
      ))}
    </div>
  );
}
