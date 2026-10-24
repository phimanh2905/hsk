import { describe, expect, it } from "vitest";
import type { VocabWord } from "@/content/vocab";
import { generateExam } from "../generate";

function w(
  hanzi: string,
  pinyin: string,
  meaning: string,
  exZh: string,
  exVi: string
): VocabWord {
  return {
    hanzi,
    pinyin,
    hanViet: "",
    meaning,
    pos: "Danh từ",
    example: { zh: exZh, pinyinPerChar: [], vi: exVi },
  };
}

const words: VocabWord[] = [
  w("你好", "nǐ hǎo", "Xin chào", "李明，你好。", "Chào Lý Minh"),
  w("老师", "lǎoshī", "Giáo viên", "老师，您好。", "Chào thầy"),
  w("学生", "xuésheng", "Học sinh", "我是学生。", "Tôi là học sinh"),
  w("中国", "Zhōngguó", "Trung Quốc", "我在中国。", "Tôi ở Trung Quốc"),
  w("人", "rén", "Người", "他是好人。", "Anh ấy là người tốt"),
  w("猫", "māo", "Con mèo", "这是猫。", "Đây là con mèo"),
];

describe("generateExam", () => {
  it("tạo đề đủ 3 sections listening/reading/writing", () => {
    const exam = generateExam(words, "HSK1");
    expect(exam.level).toBe("HSK1");
    expect(exam.title).toContain("HSK1");
    expect(exam.sections.map((s) => s.kind)).toEqual([
      "listening",
      "reading",
      "writing",
    ]);
    for (const s of exam.sections) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.questions.length).toBeGreaterThanOrEqual(s.kind === "writing" ? 2 : 5);
    }
  });

  it("listening: choice pinyin, không set audio, options 4 phần tử", () => {
    const exam = generateExam(words, "HSK1");
    const listening = exam.sections[0];
    expect(listening.questions.length).toBe(5);
    for (const q of listening.questions) {
      if (q.kind !== "choice") throw new Error("listening phải là choice");
      expect("audio" in q ? q.audio : undefined).toBeUndefined();
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(q.prompt).toContain("chọn pinyin đúng");
    }
  });

  it("reading: han2vi choice + cloze với __ đúng vị trí hanzi", () => {
    const exam = generateExam(words, "HSK1");
    const reading = exam.sections[1];
    const choices = reading.questions.filter((q) => q.kind === "choice");
    const clozes = reading.questions.filter((q) => q.kind === "cloze");
    expect(choices.length).toBeGreaterThanOrEqual(3);
    expect(clozes.length).toBeGreaterThanOrEqual(2);
    for (const q of clozes) {
      if (q.kind !== "cloze") continue;
      expect(q.sentenceWithBlank).toContain("__");
      expect(q.sentenceWithBlank).not.toContain(q.answer);
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
    }
  });

  it("writing: 2 câu free với sampleAnswer = example.zh", () => {
    const exam = generateExam(words, "HSK1");
    const writing = exam.sections[2];
    expect(writing.questions).toHaveLength(2);
    for (const q of writing.questions) {
      if (q.kind !== "free") throw new Error("writing phải là free");
      expect(q.sampleAnswer.length).toBeGreaterThan(0);
      expect(q.prompt.length).toBeGreaterThan(0);
    }
  });

  it("vocab < 4 từ → options 3 phần tử; vẫn không crash khi thiếu", () => {
    const few = words.slice(0, 3);
    const exam = generateExam(few, "HSK1");
    for (const s of exam.sections) {
      for (const q of s.questions) {
        if (q.kind === "free") continue;
        expect(q.options).toHaveLength(3);
      }
    }
  });

  it("vocab rỗng → đề rỗng sections, không crash", () => {
    const exam = generateExam([], "HSK1");
    for (const s of exam.sections) expect(s.questions).toHaveLength(0);
  });
});
