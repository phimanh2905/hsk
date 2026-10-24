/* Test validateDialogue thuần (W3): shape, số câu 8–15, vai A/B xen kẽ,
   đủ zh/pinyin/vi, OV vocab chỉ là warning (oov != rỗng, ok vẫn true). */
import { describe, expect, it } from "vitest";
import { dialogueId, upsertDialogue, validateDialogue, type DialogueRecord } from "../src/dialogues";

const VOCAB = new Set("你我好妈爱学中人有大小上下不他很来去吃看说写读听话语怎么什么哪谁几岁工作忙累谢再见是国越南汉教老师的".split(""));

function line(n: number, speaker: "A" | "B", zh: string): DialogueRecord["lines"][number] {
  return { n, speaker, zh, pinyin: `pinyin ${n}`, vi: `câu ${n}` };
}

function validRecord(): DialogueRecord {
  const zh = ["你好", "你好", "你是哪国人", "我是越南人", "你学什么", "我学汉语", "谁教你", "我的老师教我"];
  return {
    id: "hsk1/lesson-1",
    book: "hsk1",
    lesson: "lesson-1",
    title: "Greetings",
    titleVi: "Chào hỏi",
    lines: zh.map((z, i) => line(i + 1, i % 2 === 0 ? "A" : "B", z))
  };
}

describe("dialogueId", () => {
  it("ghép book/lesson", () => {
    expect(dialogueId("hsk1", "lesson-1")).toBe("hsk1/lesson-1");
  });
});

describe("upsertDialogue", () => {
  it("thay record cùng id bằng bản MỚI (bản cũ đầu mảng bị bỏ)", () => {
    const old = validRecord();
    const fresh = validRecord();
    fresh.titleVi = "BẢN MỚI";
    const merged = upsertDialogue([old], fresh);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.titleVi).toBe("BẢN MỚI");
  });

  it("append record id mới, giữ nguyên các record khác", () => {
    const a = validRecord();
    const b = validRecord();
    b.id = "hsk1/lesson-2";
    b.lesson = "lesson-2";
    const merged = upsertDialogue([a], b);
    expect(merged.map((d) => d.id)).toEqual(["hsk1/lesson-1", "hsk1/lesson-2"]);
  });

  it("bản cũ có nhiều entry trùng id -> chỉ còn bản mới", () => {
    const dup1 = validRecord();
    const dup2 = validRecord();
    const fresh = validRecord();
    fresh.titleVi = "MỚI";
    const merged = upsertDialogue([dup1, dup2], fresh);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.titleVi).toBe("MỚI");
  });
});

describe("validateDialogue", () => {
  it("hợp lệ 8 dòng, vai xen kẽ -> ok, errors rỗng", () => {
    const r = validateDialogue(validRecord(), VOCAB);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.oov).toEqual([]);
  });

  it("hợp lệ 15 dòng", () => {
    const rec = validRecord();
    const extra = [9, 10, 11, 12, 13, 14, 15].map((n) => line(n, n % 2 === 1 ? "A" : "B", "很好"));
    rec.lines.push(...extra);
    expect(validateDialogue(rec, VOCAB).ok).toBe(true);
  });

  it("7 dòng -> lỗi ít hơn 8 câu", () => {
    const rec = validRecord();
    rec.lines.pop();
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("ít hơn 8"))).toBe(true);
  });

  it("16 dòng -> lỗi", () => {
    const rec = validRecord();
    rec.lines.push(line(9, "A", "很好"), line(10, "B", "谢谢"), ...[11, 12, 13, 14, 15, 16].map((n) => line(n, n % 2 === 1 ? "A" : "B", "很好")));
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("nhiều hơn 15"))).toBe(true);
  });

  it("3 vai -> lỗi speaker không A/B", () => {
    const rec = validRecord();
    (rec.lines[3] as { speaker: string }).speaker = "C";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("speaker"))).toBe(true);
  });

  it("vai không xen kẽ -> lỗi", () => {
    const rec = validRecord();
    (rec.lines[2] as { speaker: string }).speaker = "B";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("xen kẽ"))).toBe(true);
  });

  it("thiếu pinyin/vi -> lỗi", () => {
    const rec = validRecord();
    (rec.lines[0] as { pinyin?: string }).pinyin = "";
    (rec.lines[1] as { vi?: string }).vi = "";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("thiếu zh -> lỗi", () => {
    const rec = validRecord();
    (rec.lines[0] as { zh?: string }).zh = "";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
  });

  it("hanzi ngoài vocabSet -> oov chứa ký tự, ok vẫn true", () => {
    const rec = validRecord();
    rec.lines[0]!.zh = "你好，朋。";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(true);
    expect(r.oov).toEqual(["朋"]);
  });

  it("dấu câu tiếng Trung không tính là OOV", () => {
    const rec = validRecord();
    rec.lines[0]!.zh = "你好。再见！";
    const r = validateDialogue(rec, VOCAB);
    expect(r.oov).toEqual([]);
  });

  it("n đánh số không liên tiếp (n=3 tại dòng 2) -> lỗi", () => {
    const rec = validRecord();
    (rec.lines[1] as { n: number }).n = 3;
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("liên tiếp"))).toBe(true);
  });

  it("raw không phải object / thiếu field -> ok false", () => {
    expect(validateDialogue(null, VOCAB).ok).toBe(false);
    expect(validateDialogue([], VOCAB).ok).toBe(false);
    expect(validateDialogue({ id: "x" }, VOCAB).ok).toBe(false);
  });

  it("id không khớp book/lesson -> lỗi", () => {
    const rec = validRecord();
    rec.id = "hsk2/lesson-9";
    const r = validateDialogue(rec, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("id"))).toBe(true);
  });
});
