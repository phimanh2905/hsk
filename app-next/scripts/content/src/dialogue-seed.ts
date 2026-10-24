/* W3.3 — Pure module sinh seed "Hội thoại theo bài" từ DialogueRecord[].
   Tách khỏi gen script để unit test được (script .mts chỉ gọi hàm).
   Playlist: id = slug "hoi-thoai-theo-bai" (controller ruling, sửa từ brief typo), "hoi-thoai-theo-bai".
   Video: type "audio", audioDir "audio/<book>/<lesson>", durSec = ceil(tổng durSec lines,
   line thiếu durSec → 0). Subtitle sentences: start/end cumulative từ durSec
   (end câu i = start câu i+1, câu cuối = tổng RAW — không ceil; chỉ durSec
   hiển thị mới ceil). */
import type { DialogueRecord } from "./dialogues";
import type { ShadowingPlaylist, ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

export const DIALOGUE_PLAYLIST: ShadowingPlaylist = {
  id: "hoi-thoai-theo-bai",
  slug: "hoi-thoai-theo-bai",
  name: "Hội thoại theo bài",
  total: 0,
  desc: "Hội thoại Kokoro TTS theo từng bài HSK — luyện shadowing câu chữ",
  channel: "Bye HSK",
};

export type DialogueVideoRow = ShadowingVideo & { ord: number };

function parseDur(durSec: unknown): number {
  const n = typeof durSec === "number" ? durSec : Number(durSec);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatDuration(totalSec: number): string {
  const s = Math.ceil(totalSec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function dialogueRows(
  dialogues: DialogueRecord[],
  ordBase: number
): {
  playlist: ShadowingPlaylist;
  videos: DialogueVideoRow[];
  subtitles: Record<string, SubtitleSentence[]>;
} {
  const playlist: ShadowingPlaylist = { ...DIALOGUE_PLAYLIST, total: dialogues.length };
  const videos: DialogueVideoRow[] = [];
  const subtitles: Record<string, SubtitleSentence[]> = {};

  dialogues.forEach((d, i) => {
    const durs = d.lines.map((ln) => parseDur(ln.durSec));
    const total = durs.reduce((a, b) => a + b, 0);
    const durSec = Math.ceil(total);
    videos.push({
      id: d.id,
      title: d.titleVi,
      playlistId: DIALOGUE_PLAYLIST.id,
      hsk: d.book,
      views: 0,
      viewsSuffix: "",
      duration: formatDuration(total),
      durSec,
      plays: 0,
      topic: "life",
      spd: 1,
      type: "audio",
      audioDir: `audio/${d.id}`,
      ord: ordBase + i,
    });

    let start = 0;
    subtitles[d.id] = d.lines.map((ln, j) => {
      const sentence: SubtitleSentence = {
        n: j + 1,
        start,
        end: j === d.lines.length - 1 ? total : start + durs[j],
        parts: [{ zh: ln.zh }],
        pinyin: ln.pinyin,
        vi: ln.vi,
      };
      start += durs[j];
      return sentence;
    });
  });

  return { playlist, videos, subtitles };
}
