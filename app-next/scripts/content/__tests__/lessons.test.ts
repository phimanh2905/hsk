/* Test chia bài vocab theo chủ đề (W2.3) — validateSplit, buildLessonPrompt,
   generateSplit (LLM + retry) với mock fetch. Fixture nhỏ, không cần data thật. */
import { describe, it, expect } from "vitest";
import {
  validateSplit,
  buildLessonPrompt,
  generateSplit,
  type LessonSplit
} from "../src/lessons";
import type { ChatMessage } from "../src/llm";

/* Fixture: sinh N hanzi giả "词1".."词N" (không trùng). */
function fakeHanzi(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `词${i + 1}`);
}

function splitOf(sizes: number[]): LessonSplit {
  let i = 0;
  return sizes.map((n, li) => {
    const hanziList: string[] = [];
    for (let k = 0; k < n; k++) hanziList.push(`词${++i}`);
    return { title: `Bài ${li + 1}`, hanziList };
  });
}

/* Fixture 24 từ: 16 + 8 (bài cuối 8 từ được phép). */
const ALL = fakeHanzi(24);
const TOTAL = 24;

describe("validateSplit", () => {
  it("pass với split hợp lệ (bài cuối 8 từ)", () => {
    expect(() => validateSplit(1, ALL, splitOf([16, 8]), TOTAL)).not.toThrow();
  });

  it("pass với nhiều bài (mỗi bài 15–25, cuối 20)", () => {
    const all = fakeHanzi(80);
    expect(() => validateSplit(1, all, splitOf([20, 20, 20, 20]), 80)).not.toThrow();
  });

  it("throw khi thiếu từ", () => {
    expect(() => validateSplit(1, ALL, splitOf([16, 7]), TOTAL)).toThrow(/thiếu/i);
  });

  it("throw khi từ bị trùng trong 2 bài", () => {
    const split: LessonSplit = [
      { title: "A", hanziList: [ALL[0]!, ALL[0]!, ...ALL.slice(1, 15)] },
      { title: "B", hanziList: ALL.slice(15) }
    ];
    expect(() => validateSplit(1, ALL, split, TOTAL)).toThrow(/trùng|nhiều lần/i);
  });

  it("throw khi có từ ngoài danh sách", () => {
    const split: LessonSplit = [
      { title: "A", hanziList: [...ALL.slice(0, 15), "词XYZ"] },
      { title: "B", hanziList: ALL.slice(15) }
    ];
    expect(() => validateSplit(1, ALL, split, TOTAL)).toThrow(/ngoài danh sách/i);
  });

  it("throw khi bài thường < 15 từ", () => {
    expect(() => validateSplit(1, ALL, splitOf([14, 10]), TOTAL)).toThrow(/15/);
  });

  it("throw khi bài > 25 từ", () => {
    const all = fakeHanzi(30);
    expect(() => validateSplit(1, all, splitOf([26, 4]), 30)).toThrow(/25/);
  });

  it("throw khi bài đầu < 15 từ", () => {
    expect(() => validateSplit(1, ALL, splitOf([10, 14]), TOTAL)).toThrow(/15/);
  });

  it("throw khi bài cuối < 8 từ", () => {
    const all = fakeHanzi(37);
    expect(() => validateSplit(1, all, splitOf([15, 15, 7]), 37)).toThrow(/8/);
  });

  it("throw khi title trùng", () => {
    const split = splitOf([16, 8]);
    split[1]!.title = split[0]!.title;
    expect(() => validateSplit(1, ALL, split, TOTAL)).toThrow(/title/i);
  });

  it("throw khi title rỗng", () => {
    const split = splitOf([16, 8]);
    split[0]!.title = "  ";
    expect(() => validateSplit(1, ALL, split, TOTAL)).toThrow(/title/i);
  });

  it("throw khi tổng số từ sai so với expectedTotal", () => {
    expect(() => validateSplit(1, ALL, splitOf([16, 8]), 25)).toThrow(/tổng|25/);
  });

  it("throw khi split rỗng hoặc thiếu lessons", () => {
    expect(() => validateSplit(1, ALL, [], TOTAL)).toThrow();
  });
});

describe("buildLessonPrompt", () => {
  it("chứa đủ danh sách từ và ràng buộc 15–25 từ/bài", () => {
    const messages: ChatMessage[] = buildLessonPrompt(2, ALL);
    expect(messages.length).toBe(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[1]!.role).toBe("user");
    for (const h of ALL) expect(messages[1]!.content).toContain(h);
    expect(messages[1]!.content).toContain("24");
    expect(messages[0]!.content).toContain("15");
    expect(messages[0]!.content).toContain("25");
    expect(messages[0]!.content).toContain("lessons");
  });
});

describe("generateSplit (mock fetch)", () => {
  const cfg = { baseUrl: "http://mock/v1/chat/completions", key: "k", model: "m" };
  const good = JSON.stringify({
    lessons: [
      { title: "Gia đình", hanziList: ALL.slice(0, 16) },
      { title: "Trường học", hanziList: ALL.slice(16) }
    ]
  });

  function makeFetch(content: string, calls: { n: number }): typeof fetch {
    return (async () => {
      calls.n++;
      return new Response(
        JSON.stringify({ choices: [{ message: { content } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;
  }

  it("trả split hợp lệ từ LLM ở lần đầu", async () => {
    const calls = { n: 0 };
    const split = await generateSplit(cfg, 1, ALL, {
      fetchImpl: makeFetch(good, calls),
      expectedTotal: TOTAL
    });
    expect(calls.n).toBe(1);
    expect(split.length).toBe(2);
    expect(split[0]!.hanziList.length).toBe(16);
  });

  it("retry kèm message lỗi vào prompt khi LLM trả sai, rồi thành công", async () => {
    const calls = { n: 0 };
    const bad = JSON.stringify({
      lessons: [{ title: "A", hanziList: ALL.slice(0, 10) }] // thiếu từ + bài < 15
    });
    const fetchImpl: typeof fetch = (async () => {
      const content = calls.n === 0 ? bad : good;
      calls.n++;
      return new Response(
        JSON.stringify({ choices: [{ message: { content } }] }),
        { status: 200 }
      );
    }) as typeof fetch;
    let captured: ChatMessage[] | undefined;
    const split = await generateSplit(cfg, 1, ALL, {
      fetchImpl,
      expectedTotal: TOTAL,
      onAttempt: (_i, messages) => { captured = messages; }
    });
    expect(calls.n).toBe(2);
    expect(split.length).toBe(2);
    // lần thử sau: prompt phải chứa thông báo lỗi của lần trước
    expect(captured!.at(-1)!.content).toContain("lỗi");
  });

  it("throw sau tối đa maxAttempts lần thử khi LLM luôn trả sai", async () => {
    const calls = { n: 0 };
    const bad = JSON.stringify({ lessons: [{ title: "A", hanziList: ALL.slice(0, 10) }] });
    await expect(
      generateSplit(cfg, 1, ALL, {
        fetchImpl: makeFetch(bad, calls),
        expectedTotal: TOTAL,
        maxAttempts: 5
      })
    ).rejects.toThrow(/5/);
    expect(calls.n).toBe(5);
  });
});
