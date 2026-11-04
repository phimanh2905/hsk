import { describe, it, expect } from "vitest";
import { generatePlacementBlocks, placementSuggestedStage, PLACEMENT_LEVELS } from "../placement";
import type { VocabData, VocabLesson } from "@/lib/content/vocab";

/* fixture 6 từ/level — đủ cho 2 meaning + 1 cloze + 3 distractor
   (plan fixture khai example là mảng — sửa lại khớp VocabWord.example: Example) */
function fakeLevel(hanziList: string[]): Record<string, VocabLesson> {
  const lessons: Record<string, VocabLesson> = {};
  hanziList.forEach((h, i) => {
    lessons[`l${i}`] = {
      title: `Bài ${i}`,
      words: [{
        hanzi: h, pinyin: `py${i}`, hanViet: `hv${i}`, meaning: `nghĩa ${h}`, pos: "v",
        example: { zh: `Tôi ${h} bạn`, pinyinPerChar: [], vi: `Tôi ${h} bạn` },
      }],
    };
  });
  return lessons;
}

const DATA: VocabData = {
  hsk1: fakeLevel(["一", "二", "三", "四", "五", "六"]),
  hsk2: fakeLevel(["七", "八", "九", "十", "十一", "十二"]),
  hsk3: fakeLevel(["人", "大", "小", "上", "下", "中"]),
  hsk4: fakeLevel(["天", "地", "水", "火", "山", "田"]),
  hsk5: fakeLevel(["金", "木", "水", "火", "土", "风"]),
};

describe("generatePlacementBlocks", () => {
  it("đủ 5 block × 3 câu, đúng level", () => {
    const blocks = generatePlacementBlocks(DATA, 42);
    expect(blocks.map((b) => b.level)).toEqual(PLACEMENT_LEVELS);
    for (const b of blocks) {
      expect(b.questions).toHaveLength(3);
      for (const q of b.questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4); // distractor không trùng
        expect(q.options).toContain(q.answer);
      }
    }
  });

  it("deterministic: cùng seed → cùng đề", () => {
    expect(generatePlacementBlocks(DATA, 7)).toEqual(generatePlacementBlocks(DATA, 7));
    expect(generatePlacementBlocks(DATA, 7)).not.toEqual(generatePlacementBlocks(DATA, 8));
  });

  it("meaning question: prompt chứa hanzi, answer là meaning", () => {
    const blocks = generatePlacementBlocks(DATA, 1);
    const q = blocks[0].questions.find((x) => x.kind === "meaning")!;
    expect(q.answer).toMatch(/^nghĩa /);
  });

  it("cloze question: prompt chứa __", () => {
    const blocks = generatePlacementBlocks(DATA, 1);
    const q = blocks[0].questions.find((x) => x.kind === "cloze")!;
    expect(q.prompt).toContain("__");
  });
});

describe("placementSuggestedStage", () => {
  const b = (correct: number) => ({ correct, total: 3 });
  it("fail ngay hsk1 → pinyin", () => {
    expect(placementSuggestedStage({ hsk1: b(1) })).toBe("pinyin");
  });
  it("pass hsk1, fail hsk2 → hsk1", () => {
    expect(placementSuggestedStage({ hsk1: b(3), hsk2: b(1) })).toBe("hsk1");
  });
  it("pass hết → hsk5", () => {
    expect(placementSuggestedStage({ hsk1: b(3), hsk2: b(2), hsk3: b(3), hsk4: b(2), hsk5: b(3) })).toBe("hsk5");
  });
  it("block thiếu coi như fail (dừng ở block trước)", () => {
    expect(placementSuggestedStage({ hsk1: b(3) })).toBe("hsk1");
    expect(placementSuggestedStage({})).toBe("pinyin");
  });
});
