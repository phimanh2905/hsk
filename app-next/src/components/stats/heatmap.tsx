"use client";
import { heatClass, heatData } from "@/lib/stats/heatmap";
import { Card } from "@/components/ui/card";

// Port renderHeatmap từ clone/js/progress.js:125-153.
// Tooltip hover của clone dùng div fixed theo mouse — SP1 dùng `title` attr native (kèm số xp).
export function Heatmap({ real, now = new Date() }: { real: Record<string, number> | null; now?: Date }) {
  const map = heatData(real, now);
  const cols = [];
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let day = 1; day <= days; day++) {
      const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      const v = map[key] || 0;
      cells.push(
        <span key={key} data-heat-cell
          className={"block w-[10px] h-[10px] rounded-[2px] " + heatClass(v)}
          title={`Tháng ${m + 1} ngày ${day}: Xp ${v}`} />
      );
    }
    cols.push(
      <div key={key(y, m)} className="flex flex-col items-center gap-[3px] min-w-0">
        <span className="text-[10px] font-bold text-text-secondary mb-1 whitespace-nowrap">Tháng {m + 1}</span>
        <div className="flex flex-col gap-[3px]">{cells}</div>
      </div>
    );
  }
  return (
    <Card>
      <h3 className="font-extrabold mb-1">Lịch học</h3>
      <p className="text-xs text-text-secondary mb-4">12 tháng gần đây</p>
      <div data-heat className="grid gap-2" style={{ gridTemplateColumns: "repeat(12,1fr)", overflowX: "auto" }}>{cols}</div>
    </Card>
  );
}
function key(y: number, m: number) { return `${y}-${m}`; }
