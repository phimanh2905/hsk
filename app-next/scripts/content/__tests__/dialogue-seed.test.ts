import { describe, expect, it } from "vitest";
import { dialogueRows, DIALOGUE_PLAYLIST } from "../src/dialogue-seed";
import type { DialogueRecord } from "../src/dialogues";

/* Fixture 2 bài (durSec có + thiếu — guard parse về 0). */
const dialogues: DialogueRecord[] = [
  {
    id: "hsk1/lesson-1",
    book: "hsk1",
    lesson: "lesson-1",
    title: "打招呼",
    titleVi: "Chào hỏi",
    lines: [
      { n: 1, speaker: "A", zh: "你好！", pinyin: "Nǐ hǎo!", vi: "Xin chào!", durSec: 3.5 },
      { n: 2, speaker: "B", zh: "你好，你叫什么名字？", pinyin: "Nǐ hǎo, nǐ jiào shénme míngzi?", vi: "Chào, bạn tên gì?", durSec: 4 },
      { n: 3, speaker: "A", zh: "我叫小明。", pinyin: "Wǒ jiào Xiǎomíng.", vi: "Tôi tên Tiểu Minh." }, // thiếu durSec → 0
    ],
  },
  {
    id: "hsk1/lesson-2",
    book: "hsk1",
    lesson: "lesson-2",
    title: "买东西",
    titleVi: "Mua sắm",
    lines: [
      { n: 1, speaker: "A", zh: "这个多少钱？", pinyin: "Zhège duōshao qián?", vi: "Cái này bao nhiêu tiền?", durSec: 5 },
      { n: 2, speaker: "B", zh: "十块。", pinyin: "Shí kuài.", vi: "Mười tệ.", durSec: 2.2 },
    ],
  },
];

describe("dialogueRows (W3.3 seed playlist Hội thoại theo bài)", () => {
  const out = dialogueRows(dialogues, 20);

  it("1 playlist đúng id/slug/name/channel", () => {
    expect(out.playlist).toEqual({
      id: "htoi-thoai-theo-bai",
      slug: "hoi-thoai-theo-bai",
      name: "Hội thoại theo bài",
      total: 2,
      desc: DIALOGUE_PLAYLIST.desc,
      channel: "Bye HSK",
    });
  });

  it("video row mỗi dialogue: id, playlist, type audio, audioDir, durSec ceil tổng", () => {
    expect(out.videos).toHaveLength(2);
    const v1 = out.videos[0];
    expect(v1.id).toBe("hsk1/lesson-1");
    expect(v1.playlistId).toBe("htoi-thoai-theo-bai");
    expect(v1.type).toBe("audio");
    expect(v1.audioDir).toBe("audio/hsk1/lesson-1");
    expect(v1.durSec).toBe(8); // ceil(3.5 + 4 + 0)
    expect(v1.hsk).toBe("hsk1");
    expect(v1.duration).toBe("0:08");
    expect(v1.views).toBe(0);
    expect(v1.viewsSuffix).toBe("");
    expect(v1.plays).toBe(0);
    expect(v1.topic).toBe("life");
    expect(v1.spd).toBe(1);
    expect(v1.title).toContain("Chào hỏi");
    expect(out.videos[1].durSec).toBe(8); // ceil(5 + 2.2)
    expect(out.videos[1].duration).toBe("0:08");
    expect(out.videos[1].audioDir).toBe("audio/hsk1/lesson-2");
  });

  it("ord tiếp tục từ ordBase", () => {
    expect(out.videos.map((v) => v.ord)).toEqual([20, 21]);
  });

  it("subtitle sentences: start/end cumulative, parts [{zh}], pinyin/vi từ line", () => {
    const s1 = out.subtitles["hsk1/lesson-1"];
    expect(s1).toHaveLength(3);
    expect(s1[0]).toEqual({
      n: 1, start: 0, end: 3.5,
      parts: [{ zh: "你好！" }],
      pinyin: "Nǐ hǎo!", vi: "Xin chào!",
    });
    expect(s1[1].start).toBe(3.5);
    expect(s1[1].end).toBe(7.5); // end câu i = start câu i+1
    expect(s1[2].start).toBe(7.5);
    expect(s1[2].end).toBe(8); // câu cuối end = durSec tổng
    const s2 = out.subtitles["hsk1/lesson-2"];
    expect(s2[1].start).toBe(5);
    expect(s2[1].end).toBe(8); // câu cuối end = durSec (ceil tổng)
    expect(s2[0].parts).toEqual([{ zh: "这个多少钱？" }]);
  });
});
