/* % phụ đề đã hoàn thành trên library card (spec W1.4). Thuần, test được. */
import type { ProgressRec } from "@/lib/shadowing/progress";

export function subtitlePct(rec: ProgressRec | undefined, totalLines: number): number | null {
  if (!rec || totalLines <= 0) return null;
  if (rec.status === "done") return 100;
  return Math.min(Math.round((rec.linesDone / totalLines) * 100), 100);
}
