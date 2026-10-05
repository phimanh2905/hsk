/* pickDaily — daily pick cho library /shadowing (spec §2.2):
   chỉ quay số trong video CÓ subtitle thật; nếu không có video nào có subtitle
   thì fallback toàn bộ. Deterministic theo ngày: idx = floor(now/86400s) % pool. */
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

export function pickDaily(
  videos: ShadowingVideo[],
  subs: Record<string, SubtitleSentence[]>,
  now: Date,
): ShadowingVideo {
  const candidates = videos.filter((v) => subs[v.id]?.length);
  const pool = candidates.length ? candidates : videos;
  return pool[Math.floor(now.getTime() / 86_400_000) % pool.length];
}

/* Video không có subtitle thật → dựng 1 câu tổng hợp từ title để card/hero
   vẫn có "câu đầu" (mẫu câu chính, TTS phát thử) mà không bị null. */
export function syntheticLines(v: ShadowingVideo): SubtitleSentence[] {
  return [
    {
      n: 1,
      start: 0,
      end: v.durSec,
      parts: [{ zh: v.title }],
      pinyin: "",
      vi: "",
    },
  ];
}
