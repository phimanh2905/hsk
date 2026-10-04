"use client";

import { Card } from "@/components/ui/card";
import { Flame, Clock3, CheckCircle2 } from "@/components/ui/icon";

export type BucketData = { count: number; words: { zh: string; key: string }[] };

const TONE = {
  rose: { card: "rose", head: "text-learning-due", icon: Flame },
  amber: { card: "amber", head: "text-amber-ink", icon: Clock3 },
  jade: { card: "jade", head: "text-learning-mastered", icon: CheckCircle2 },
} as const;

function Bucket({ tone, title, desc, data, onChipClick }: {
  tone: keyof typeof TONE;
  title: string;
  desc: string;
  data: BucketData;
  onChipClick: (zh: string) => void;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <Card tone={t.card} data-testid="bucket" className="p-4 transition-transform hover:-translate-y-0.5">
      <div className={`flex items-center gap-2 text-[13.5px] font-extrabold ${t.head}`}>
        <Icon size={16} aria-hidden="true" />
        {title}
        <span className="ml-auto text-xs font-bold opacity-80">{data.count} từ</span>
      </div>
      <p className="mb-2.5 mt-1 text-xs text-text-secondary">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {data.words.length === 0 ? (
          <span className="text-xs text-text-secondary">Trống</span>
        ) : (
          data.words.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => onChipClick(w.zh)}
              className="zh min-h-10 rounded-[10px] border border-border-default bg-surface-elevated px-3 py-1.5 text-[15px] font-bold transition-colors hover:border-action-primary hover:text-action-primary"
            >
              {w.zh}
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

/* 3 Leitner buckets (mock .buckets, spec §3): rose Yếu / amber Đang củng cố / jade Đã khắc sâu. */
export function SrsBuckets({ weak, cons, mast, onChipClick }: {
  weak: BucketData;
  cons: BucketData;
  mast: BucketData;
  onChipClick: (zh: string) => void;
}) {
  return (
    <section aria-label="Trạng thái trí nhớ" className="grid gap-3 md:grid-cols-3">
      <Bucket tone="rose" title="Yếu · Dễ quên" desc="Cần ôn gấp trong hôm nay" data={weak} onChipClick={onChipClick} />
      <Bucket tone="amber" title="Đang củng cố" desc="Ôn định kỳ 3 ngày một lần" data={cons} onChipClick={onChipClick} />
      <Bucket tone="jade" title="Đã khắc sâu" desc="Ôn nhắc lại sau 7 ngày" data={mast} onChipClick={onChipClick} />
    </section>
  );
}
