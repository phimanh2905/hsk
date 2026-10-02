"use client";
import { DIST_META, donutSlices, distPercents, R, C, type Dist } from "@/lib/stats/donut";

/* Port từ clone/js/review-stats.js renderDonut — donut largest-remainder r=15.9155 (C ≈ 100). */
export function Donut({ dist, footer }: { dist: Dist; footer?: string }) {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  const title = "Phân bổ đánh giá" + (total > 0 ? ` (${total} lượt)` : "");
  const pcts = distPercents(dist);
  return (
    <div className="card shadow-neo p-5">
      <h3 className="font-extrabold tracking-tight mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0 w-40 h-40">
          <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90" role="img" aria-label={title}>
            <circle cx="21" cy="21" r={R} fill="none" stroke="var(--nhai-soft)" strokeWidth="6" />
            {donutSlices(dist).map((s, i) => (
              <circle
                key={i}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="6"
                strokeDasharray={`${s.len} ${C - s.len}`}
                strokeDashoffset={s.offset}
              />
            ))}
          </svg>
        </div>
        <div className="space-y-2 text-sm">
          {DIST_META.map((m, i) => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: m.color }} />
              <span>
                {m.label} — {dist[m.key] || 0} ({pcts[i]}%)
              </span>
            </div>
          ))}
        </div>
      </div>
      {footer ? <p className="text-xs text-[var(--nhai-muted)] mt-4">{footer}</p> : null}
    </div>
  );
}
