import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";
import { memLabel, memTone, type MemTone } from "@/lib/stats/review";

const TONE_FILL: Record<MemTone, "vermilion" | "amber" | "jade"> = {
  weak: "vermilion",
  mid: "amber",
  strong: "jade",
};

const PILL: Record<MemTone, string> = {
  weak: "text-feedback-error-text border-feedback-error/40 bg-feedback-error/10",
  mid: "text-amber-ink border-learning-streak/40 bg-amber-wash",
  strong: "text-learning-mastered border-learning-mastered/40 bg-jade-wash",
};

/* Độ bền trí nhớ (mock .membar, spec §3): Progress sm + % + pill nhãn Yếu/Vừa/Sâu. */
export function MemBar({ value, className }: { value: number; className?: string }) {
  const tone = memTone(value);
  return (
    <span className={cn("flex min-w-40 items-center gap-2", className)}>
      <Progress
        value={value}
        tone={TONE_FILL[tone]}
        size="sm"
        className="flex-1"
        ariaLabel={`Độ bền trí nhớ ${value}%`}
      />
      <b className="min-w-9 text-right text-xs tabular-nums">{value}%</b>
      <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-extrabold", PILL[tone])}>
        {memLabel(value)}
      </span>
    </span>
  );
}
