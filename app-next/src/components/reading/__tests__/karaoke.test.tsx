import { describe, it, expect } from "vitest";
import { splitSentences, extractTitle, buildSentences } from "../karaoke";
import { readingData } from "@/content/reading";

describe("karaoke tokenizer (G3)", () => {
  it("splitSentences giữ dấu câu cuối, bỏ rỗng", () => {
    expect(splitSentences("你好。我叫小明！再见？")).toEqual(["你好。", "我叫小明！", "再见？"]);
    expect(splitSentences("。！？")).toEqual([]);
    expect(splitSentences("第二句没有句号")).toEqual(["第二句没有句号"]);
  });
  it("extractTitle: dòng đầu ≤20 ký tự là title", () => {
    expect(extractTitle("一个人的生活\n我一个人住在公寓里。")).toEqual({ title: "一个人的生活", body: "我一个人住在公寓里。" });
    expect(extractTitle("Một dòng dài hơn hai mươi ký tự thì không phải tiêu đề của bài")).toEqual({ title: null, body: "Một dòng dài hơn hai mươi ký tự thì không phải tiêu đề của bài" });
  });
  it("buildSentences: khớp demoDoc → py+vi; không khớp → vi fallback verbatim, py null", () => {
    const map = Object.fromEntries(readingData.demoDoc.sentences.map((s) => [s.zh, s]));
    const out = buildSentences("我在学习汉语。Câu lạ không có trong demo。", map);
    expect(out[0]).toEqual({ zh: "我在学习汉语。", py: null, vi: "(bản dịch demo — tính năng AI cần backend)" });
    expect(out[1].vi).toBe("(bản dịch demo — tính năng AI cần backend)");
    const demo = buildSentences(readingData.demoDoc.sentences.map((s) => s.zh).join(""), map);
    expect(demo[0].vi).toBe("Tôi sống một mình trong một căn hộ nhỏ xíu.");
    expect(demo[0].py).toBe("Wǒ yíge rén zhù zài yì jiān xiǎoxiǎo de gōngyù lǐ.");
  });
});
