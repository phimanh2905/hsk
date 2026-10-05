/* Fixture dùng chung cho daily.test.ts + shadowing-library.test.tsx:
   2 video DEMO (có topic/spd), chỉ 1 video có subtitle thật (2 câu). */
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

export const videosFixture: ShadowingVideo[] = [
  {
    id: "EA3rwvr99Q0",
    title: "墓碑上的QR碼，別掃。",
    playlistId: "daihuaxiyou",
    hsk: "HSK3",
    views: 397,
    viewsSuffix: "",
    duration: "2:46",
    durSec: 166,
    plays: 366,
    topic: "film",
    spd: 0.9,
  },
  {
    id: "fixture-hsk1",
    title: "你好，很高兴认识你。",
    playlistId: "so-cap",
    hsk: "HSK1",
    views: 11,
    viewsSuffix: "",
    duration: "1:00",
    durSec: 60,
    plays: 10,
    topic: "life",
    spd: 0.8,
  },
];

export const subsFixture: Record<string, SubtitleSentence[]> = {
  EA3rwvr99Q0: [
    {
      n: 1,
      start: 0,
      end: 4,
      parts: [{ zh: "墓碑上有一個QR碼。" }],
      pinyin: "mù bēi shàng yǒu yī gè QR mǎ.",
      vi: "Trên bia mộ có một mã QR.",
    },
    {
      n: 2,
      start: 4,
      end: 8,
      parts: [{ zh: "別掃。" }],
      pinyin: "bié sǎo.",
      vi: "Đừng quét.",
    },
  ],
};
