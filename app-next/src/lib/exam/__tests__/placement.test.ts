import { describe, it, expect } from "vitest";
import { generatePlacementBlocks, placementSuggestedStage, PLACEMENT_LEVELS } from "../placement";
import type { VocabData, VocabLesson } from "@/lib/content/vocab";

/* fixture 6 từ/level — đủ cho 2 meaning + 1 cloze + 3 distractor
   (plan fixture khai example là mảng — sửa lại khớp VocabWord.example: Example) */
function fakeLevel(
  hanziList: string[],
  opts?: { meaning?: (h: string, i: number) => string; exampleZh?: (h: string, i: number) => string },
): Record<string, VocabLesson> {
  const lessons: Record<string, VocabLesson> = {};
  hanziList.forEach((h, i) => {
    lessons[`l${i}`] = {
      title: `Bài ${i}`,
      words: [{
        hanzi: h, pinyin: `py${i}`, hanViet: `hv${i}`,
        meaning: opts?.meaning ? opts.meaning(h, i) : `nghĩa ${h}`, pos: "v",
        example: { zh: opts?.exampleZh ? opts.exampleZh(h, i) : `Tôi ${h} bạn`, pinyinPerChar: [], vi: `Tôi ${h} bạn` },
      }],
    };
  });
  return lessons;
}

function buildData(hsk1: Record<string, VocabLesson>): VocabData {
  return {
    hsk1,
    hsk2: fakeLevel(["七", "八", "九", "十", "十一", "十二"]),
    hsk3: fakeLevel(["人", "大", "小", "上", "下", "中"]),
    hsk4: fakeLevel(["天", "地", "水", "火", "山", "田"]),
    hsk5: fakeLevel(["金", "木", "水", "火", "土", "风"]),
  };
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

  it("cloze fallback: example không chứa hanzi → câu thứ 3 rơi về meaning", () => {
    // example.zh không bao giờ chứa hanzi → clozeQ trả null cho mọi từ
    const data = buildData(fakeLevel(["一", "二", "三", "四", "五", "六"], { exampleZh: () => "Tôi đi học" }));
    const blocks = generatePlacementBlocks(data, 0);
    expect(blocks).toHaveLength(5);
    const b0 = blocks[0];
    expect(b0.questions).toHaveLength(3);
    expect(b0.questions[2].kind).toBe("meaning");
    for (const q of b0.questions) {
      expect(q.options).toContain(q.answer);
    }
  });

  it("distractor nghèo: 2 từ trùng meaning → không crash, options không trùng lặp", () => {
    // từ "一" và "二" cùng nghĩa "trùng nghĩa"
    const data = buildData(fakeLevel(["一", "二", "三", "四", "五", "六"], {
      meaning: (h) => (h === "一" || h === "二" ? "trùng nghĩa" : `nghĩa ${h}`),
    }));
    expect(() => generatePlacementBlocks(data, 0)).not.toThrow();
    const blocks = generatePlacementBlocks(data, 0);
    // câu meaning của từ trùng (seed 0 → offset 0 → từ "一" được hỏi ở câu 1)
    const dup = blocks[0].questions.find((q) => q.kind === "meaning" && q.answer === "trùng nghĩa");
    expect(dup).toBeDefined();
    expect(new Set(dup!.options).size).toBe(dup!.options.length); // không trùng lặp
    expect(dup!.options).toContain(dup!.answer);
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
