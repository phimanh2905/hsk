import { describe, expect, it } from "vitest";
import { countHanChars, gradeFreeAnswer, normalizeAnswer } from "../grade";

describe("normalizeAnswer — decision table", () => {
  it.each([
    ["你好，世界！", "你好世界"],
    [" 你好 。 ", "你好"],
    ["x,y; z", "xyz"],
    ["“你好”", "你好"],
    ["你好‘x’（test）「y」《z》…", "你好xtestyz"],
    ["", ""],
  ])("normalizeAnswer(%j) → %j", (input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected);
  });
});

describe("countHanChars", () => {
  it("你好abc → 2", () => expect(countHanChars("你好abc")).toBe(2));
  it('"" → 0', () => expect(countHanChars("")).toBe(0));
  it("chỉ latin → 0", () => expect(countHanChars("abc XYZ")).toBe(0));
});

describe("gradeFreeAnswer — decision table", () => {
  it("đúng: normalize bằng nhau và đủ chữ Hán", () => {
    expect(gradeFreeAnswer("你好，世界！", "你好世界！")).toEqual({
      correct: true,
      hanCount: 4,
    });
  });
  it("sai: thiếu chữ", () => {
    expect(gradeFreeAnswer("你好", "你好世界").correct).toBe(false);
  });
  it("sai: không có chữ Hán", () => {
    expect(gradeFreeAnswer("abc", "你好")).toEqual({ correct: false, hanCount: 0 });
  });
  it("đúng sau khi bỏ dấu câu/dấu ngoặc kép", () => {
    expect(gradeFreeAnswer("“你好”", "你好").correct).toBe(true);
  });
});
