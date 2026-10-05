/* Tiến độ shadowing phía client (spec §5.3). Key localStorage cho guest;
   user đăng nhập đi qua use-shadowing-progress (API), lớp này chỉ là store thuần. */
export type ProgressStatus = "new" | "mid" | "done";
export type ProgressRec = { status: ProgressStatus; score: number | null; seconds: number; linesDone: number; updatedAt: string };
export type ProgressMap = Record<string, ProgressRec>;

const KEY = "bye.shadow.progress";

export function readLocalProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function writeLocalProgress(map: ProgressMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* private mode */ }
}

/* Sau khi merge guest lên server, xoá hẳn key để lần đăng nhập sau không merge lại. */
export function clearLocalProgress(): void {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

export function computeMetrics(map: ProgressMap): { practiced: number; seconds: number; avgScore: number | null } {
  const recs = Object.values(map).filter((r) => r.status === "mid" || r.status === "done");
  const done = recs.filter((r) => r.status === "done" && r.score != null);
  return {
    practiced: recs.length,
    seconds: recs.reduce((s, r) => s + r.seconds, 0),
    avgScore: done.length ? Math.round(done.reduce((s, r) => s + (r.score ?? 0), 0) / done.length) : null,
  };
}
