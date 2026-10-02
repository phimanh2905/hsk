"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { progressStore } from "@/lib/store/progress-store";
import { computeReviewStats } from "@/lib/stats/review";
import { reviewData } from "@/content/review";
import { vocab } from "@/content/vocab";
import { Donut } from "@/components/stats/donut";
import { SevenDayBars } from "@/components/stats/seven-day-bars";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

/* Port buildFrame/renderCounts/renderEmptyCard/renderDetail từ clone/js/review-stats.js:43-159.
   SP1: 6 ô đếm suy diễn từ SRS thật khi có thẻ (computeReviewStats 21 ngày), fallback seeded reviewData. */

const COUNT_META = [
  { label: "Cần ôn", cls: "text-learning-due" },
  { label: "Mới thêm", cls: "text-text-secondary" },
  { label: "Đang học", cls: "text-learning-progress" },
  { label: "Mới thuộc (< 21 ngày)", cls: "text-feedback-success" },
  { label: "Đã thuộc (dài hạn)", cls: "text-learning-mastered" },
  { label: "Tổng đã học qua", cls: "text-action-primary" },
];

const LINK_BTN =
  "inline-flex items-center justify-center rounded-control border font-semibold min-h-11 px-5 " +
  "bg-action-primary text-white border-transparent hover:bg-action-primary-hover active:bg-action-primary-active " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

export default function ReviewDashboard() {
  const [domain, setDomain] = useState<"vocab" | "grammar">("vocab");
  const [mounted, setMounted] = useState(false); // mount-gate: SSR/first render luôn seeded, tránh hydration mismatch
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);

  const srs = mounted ? progressStore.getAllSrs() : [];
  const hasVocabEntry = (b: string, p: string) => !!vocab[b]?.[p];
  const stats = srs.length ? computeReviewStats(srs, domain, Date.now(), hasVocabEntry) : null;
  const counts = stats
    ? [stats.due, stats.new, stats.learning, stats.recent, stats.learned, stats.total]
    : reviewData.counts;

  return (
    <div className="mb-6">
      <section className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Thống kê học tập</h1>
        <p className="text-text-secondary">
          Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 2 lần là thành thạo.
        </p>
      </section>

      <div className="flex gap-2 mb-5" role="tablist" aria-label="Nhóm thẻ">
        {([["vocab", "Từ vựng"], ["grammar", "Ngữ pháp"]] as const).map(([d, label]) => (
          <Chip
            key={d}
            role="tab"
            data-domain={d}
            aria-selected={domain === d}
            selected={domain === d}
            onClick={() => setDomain(d)}
          >
            {label}
          </Chip>
        ))}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {COUNT_META.map((m, i) => (
          <Card key={m.label} className="p-4 text-center">
            <div data-stat={m.label} className={`text-[28px] leading-8 font-extrabold ${m.cls}`}>
              {counts[i] ?? 0}
            </div>
            <div className="text-xs font-semibold text-text-secondary mt-1">{m.label}</div>
          </Card>
        ))}
      </section>

      <section className="mb-6">
        {srs.length > 0 ? (
          <Card className="p-6 text-center">
            <h2 className="text-xl font-extrabold tracking-tight mb-3">Bộ thẻ của bạn</h2>
            <Link href="/lesson/hsk1/lesson-1?mode=quiz" className={LINK_BTN}>
              Bắt đầu ôn tập ({srs.length} thẻ)
            </Link>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-extrabold tracking-tight mb-2">Bộ thẻ đang trống</h2>
            <p className="text-text-secondary mb-4">{reviewData.copy[domain].emptyDesc}</p>
            <Link href={reviewData.copy[domain].emptyHref} className="font-bold text-action-primary hover:underline">
              {reviewData.copy[domain].emptyLink}
            </Link>
          </Card>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-extrabold tracking-tight mb-3">Chi tiết ôn tập</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Streak", value: `${reviewData.streak || 0} ngày` },
            { label: "Hôm nay", value: `${reviewData.today || 0} lượt` },
            { label: "Tuần này", value: `${reviewData.week || 0} lượt` },
            { label: "TB / ngày", value: `${reviewData.avgPerDay || 0} lượt` },
            { label: "TB / thẻ", value: `${reviewData.avgPerCard || 0} giây` },
          ].map((c) => (
            <Card key={c.label} className="p-4 text-center">
              <div className="text-2xl font-extrabold">{c.value}</div>
              <div className="text-xs font-semibold text-text-secondary mt-1">{c.label}</div>
            </Card>
          ))}
        </div>

        <SevenDayBars last7={reviewData.last7} />
        <Donut
          dist={reviewData.dist}
          footer={`Tổng: ${reviewData.total} lượt · Tháng này: ${reviewData.monthTotal} lượt`}
        />
      </section>

      <p className="text-xs text-text-secondary text-center py-4">
        Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk
      </p>
      {/* tick chỉ để re-render khi nhai:progress bắn; không render giá trị */}
      <span hidden data-tick={tick} />
    </div>
  );
}
