/* Port renderWeek từ clone/js/review-stats.js:161-180 — bar chart 7 ngày gần nhất. */
const DAY_LABELS = ["T3", "T4", "T5", "T6", "T7", "CN", "T2"];

export function SevenDayBars({ last7 }: { last7: number[] }) {
  const max = Math.max(...last7, 1);
  return (
    <div className="card shadow-neo p-5 mb-6">
      <h3 className="font-extrabold tracking-tight mb-4">7 ngày gần nhất</h3>
      <div className="flex items-end justify-between gap-2 h-40">
        {last7.map((v, i) => {
          const isToday = i === last7.length - 1; /* cột cuối = hôm nay (T2) */
          const h = Math.round((v / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div
                data-bar
                className="w-full max-w-[36px] rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: isToday ? "var(--nhai-main)" : "var(--nhai-soft)",
                  border: "1px solid var(--nhai-border)",
                }}
              />
              <div className="text-[11px] font-semibold text-[var(--nhai-muted)]">{DAY_LABELS[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
