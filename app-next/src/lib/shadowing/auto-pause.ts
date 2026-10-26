/* Logic thuần auto-pause + karaoke (spec WSD.2). Engine poll 100ms rồi gọi
   các hàm này — không setTimeout ở đây. Thời gian words theo ms, engine theo
   giây: engine tự nhân 1000. */
import type { ShadowWord } from "@/content/shadowing";

/** ms điểm dừng khi auto-pause bật: endMs của từ cuối, kẹp trong [.., sentenceEndMs] */
export function sentencePauseMs(words: ShadowWord[] | undefined, sentenceEndMs: number): number | null {
  if (!words || words.length === 0) return null;
  const last = words[words.length - 1];
  if (!(last.endMs > 0)) return null;
  return Math.min(last.endMs, sentenceEndMs);
}

/** index từ đang phát tại tMs cho karaoke — -1 nếu ngoài mọi khoảng */
export function activeWordIndex(words: ShadowWord[], tMs: number): number {
  for (let i = 0; i < words.length; i++) {
    if (tMs >= words[i].startMs && tMs < words[i].endMs) return i;
  }
  return -1;
}
