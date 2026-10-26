// app-next/src/lib/shadowing/dictation-stats.ts
/* Stats chép chính tả per video/line — lưu qua ProgressStore (localStorage).
   Panel Dictation đọc để hiện "Điểm lần trước / Lượt phát lại". */
import { progressStore } from "@/lib/store/progress-store";
export type { DictStats, DictLineStat } from "@/lib/store/progress-store";
export const getDictStats = (videoId: string) => progressStore.getDictStats(videoId);
export const recordDictCheck = (videoId: string, lineN: number, score: number, errors: number) =>
  progressStore.recordDictCheck(videoId, lineN, score, errors);
export const recordReplay = (videoId: string, lineN: number) => progressStore.recordReplay(videoId, lineN);
