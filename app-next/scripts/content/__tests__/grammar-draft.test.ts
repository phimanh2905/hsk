/* TDD grammar-draft (W2.5): prompt chỉ yêu cầu LLM sinh 6 field nhìn được;
   id = slug pinyin bỏ dấu derive DETERMINISTIC qua python bridge (stub rows);
   parse validate: topic enum, formula ≥2 + ≥1 "key", pitfall đúng 3 (bold không rỗng),
   ex 1–3 câu, không trùng hz (existing lẫn trong-response). */
import { describe, expect, it } from "vitest";
import { buildGrammarPrompt, parseGrammarResponse, grammarDraftSchema, CHUNK_SIZE } from "../src/grammar-draft";
import type { CharPy } from "../src/pinyin-derive";

const ROWS: CharPy[][] = [
  [{ c: "把", py: "bǎ", t3: "ba3" }, { c: "字", py: "zì", t3: "zi3" }, { c: "句", py: "jù", t3: "ju4" }],
  [{ c: "越", py: "yuè", t3: "yue4" }, { c: "…", py: "…", t3: "…" }, { c: "越", py: "yuè", t3: "yue4" }, { c: "…", py: "…", t3: "…" }]
];

const POINT = {
  title: "CÂU CHỮ 把",
  hz: "把字句",
  topic: "ba",
  def: "Xử lý tân ngữ và kết quả hành động.",
  formula: [["S"], ["把", "key"], ["Tân ngữ"], ["Động từ"]],
  pitfall: ["Động từ ", "không được đứng đơn độc", " sau tân ngữ."],
  ex: [{ hz: "请把书打开。", py: "Qǐng bǎ shū dǎkāi.", vi: "Xin hãy mở sách ra." }]
};

const CONTENT = JSON.stringify({ points: [POINT, { ...POINT, hz: "越…越…", topic: "hutu", title: "CÀNG… CÀNG…" }] });

describe("buildGrammarPrompt", () => {
  const messages = buildGrammarPrompt(3, 10, ["把字句", "比字句"]);

  it("có system + user", () => {
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system yêu cầu đúng 6 field + ràng buộc cấu trúc", () => {
    const s = messages[0].content;
    expect(s).toContain('{"points":[...]}');
    for (const f of ["title", "hz", "topic", "def", "formula", "pitfall", "ex"]) expect(s).toContain(f);
    expect(s).toContain("HSK 3");
    for (const t of ["ba", "bi", "bongu", "hutu"]) expect(s).toContain(`"${t}"`);
    expect(s).toContain("key");
    expect(s).toContain("py"); // ex có pinyin cả câu (LLM sinh, không per-char)
  });

  it("user chứa count + danh sách existing để tránh trùng", () => {
    const u = JSON.parse(messages[1].content) as { count: number; avoid: string[] };
    expect(u.count).toBe(10);
    expect(u.avoid).toEqual(["把字句", "比字句"]);
  });

  it("prompt cấm chép nội dung có bản quyền", () => {
    expect(messages[0].content).toContain("bản quyền");
  });
});

describe("grammarDraftSchema", () => {
  it("point hợp lệ pass", () => {
    expect(() => grammarDraftSchema.parse(POINT)).not.toThrow();
  });

  it("topic sai enum -> fail", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, topic: "so sanh" })).toThrow();
  });

  it("formula không có 'key' nào -> fail (zod superRefine)", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, formula: [["S"], ["Tân ngữ"]] })).toThrow();
  });

  it("formula < 2 phần tử -> fail", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, formula: [["把", "key"]] })).toThrow();
  });

  it("pitfall bold rỗng -> fail", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, pitfall: ["", "", ""] })).toThrow();
  });

  it("pitfall != 3 phần tử -> fail", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, pitfall: ["a", "b"] })).toThrow();
  });

  it("ex 0 hoặc 4 câu -> fail", () => {
    expect(() => grammarDraftSchema.parse({ ...POINT, ex: [] })).toThrow();
    expect(() =>
      grammarDraftSchema.parse({ ...POINT, ex: [POINT.ex[0]!, POINT.ex[0]!, POINT.ex[0]!, POINT.ex[0]!] })
    ).toThrow();
  });
});

describe("parseGrammarResponse", () => {
  it("response hợp lệ -> drafts đúng level + id slug pinyin bỏ dấu (qua rows stub)", async () => {
    const drafts = await parseGrammarResponse(3, CONTENT, ["比字句"], { rows: ROWS });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]!.level).toBe("HSK 3");
    expect(drafts[0]!.id).toBe("ba-zi-ju");
    expect(drafts[1]!.id).toBe("yue-yue"); // punct bỏ, không có nối liền dash kép
    expect(drafts[0]).not.toHaveProperty("undefined");
  });

  // Ruling W2 chạy bù: hạt từ trùng hz với nghĩa khác (了1/了2) là điểm NGỮ PHÁP
  // khác nhau hợp lệ — parseGrammarResponse chỉ warn; id uniqueness xử ở bridge.
  it("trùng hz với existing -> chấp nhận (warn)", async () => {
    const pts = await parseGrammarResponse(3, CONTENT, ["把字句"], { rows: ROWS });
    expect(pts).toHaveLength(2);
  });

  it("trùng hz trong cùng response -> chấp nhận (warn)", async () => {
    const dup = JSON.stringify({ points: [POINT, POINT] });
    const pts = await parseGrammarResponse(3, dup, [], { rows: ROWS });
    expect(pts).toHaveLength(2);
  });

  it("topic sai -> throw", async () => {
    const bad = JSON.stringify({ points: [{ ...POINT, topic: "khac" }] });
    await expect(parseGrammarResponse(3, bad, [], { rows: ROWS })).rejects.toThrow(/topic/);
  });

  it("formula thiếu 'key' -> throw", async () => {
    const bad = JSON.stringify({ points: [{ ...POINT, formula: [["S"], ["Động từ"]] }] });
    await expect(parseGrammarResponse(3, bad, [], { rows: ROWS })).rejects.toThrow(/formula/);
  });

  it("points không phải mảng -> throw", async () => {
    await expect(parseGrammarResponse(3, JSON.stringify({ points: {} }), [], { rows: ROWS })).rejects.toThrow(/points/);
  });
});

describe("CHUNK_SIZE", () => {
  it("10 điểm/lần gọi", () => {
    expect(CHUNK_SIZE).toBe(10);
  });
});
