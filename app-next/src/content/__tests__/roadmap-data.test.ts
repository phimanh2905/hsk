import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { roadmapSessions, roadmapStages, roadmapCopy } from "../roadmap";
import { roadmapPinyinSteps } from "../roadmapPinyin";

describe("roadmapSessions (8 buổi)", () => {
  it("đủ 8 buổi đúng tên + thời lượng", () => {
    expect(roadmapSessions).toHaveLength(8);
    expect(roadmapSessions[0]).toMatchObject({ n: 1, title: "4 thanh cơ bản", minutes: 15 });
    expect(roadmapSessions[7]).toMatchObject({ n: 8, title: "Bài tổng kết", minutes: 25 });
  });
  it("mỗi buổi >=3 learn (nguồn chỉ có 3 ở buổi 2-8), 6 cards, 2 quiz, 2 test", () => {
    for (const s of roadmapSessions) {
      expect(s.learn.length).toBeGreaterThanOrEqual(3);
      expect(s.cards).toHaveLength(6);
      expect(s.quiz).toHaveLength(2);
      expect(s.test).toHaveLength(2);
      for (const q of s.quiz) {
        expect(q.options).toHaveLength(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
      }
    }
  });
  it("buổi 1 đúng 4 ô thanh ā/á/ǎ/à với ví dụ 妈/麻/马/骂", () => {
    expect(roadmapSessions[0].learn.map((l) => l.tone)).toEqual(["ā", "á", "ǎ", "à"]);
    expect(roadmapSessions[0].learn.map((l) => l.ex!.hanzi)).toEqual(["妈", "麻", "马", "骂"]);
  });
  it("nội dung khớp nguồn clone/js/data/roadmap.js (normalize test items)", () => {
    const src = readFileSync(resolve(__dirname, "../../../../clone/js/data/roadmap.js"), "utf8");
    const win: Record<string, any> = {};
    new Function("window", src)(win);
    const sourceSessions = win.NHAI_DATA.roadmap.pinyin.sessions;
    expect(roadmapSessions.map((s) => JSON.stringify([s.n, s.title, s.minutes, s.desc, s.learn, s.cards, s.quiz]))).toEqual(
      sourceSessions.map((s: any) => JSON.stringify([s.n, s.title, s.minutes, s.desc, s.learn, s.cards, s.quiz])),
    );
    for (let i = 0; i < sourceSessions.length; i++) {
      expect(roadmapSessions[i].test).toEqual(
        sourceSessions[i].test.map((t: any) =>
          t.prompt !== undefined
            ? { kind: "written", q: t.prompt, accept: [t.answer] }
            : { kind: "quiz", q: t.q, options: t.options, answer: t.answer, explain: t.explain },
        ),
      );
    }
  });
});

describe("roadmapPinyinSteps (6 bước)", () => {
  it("đủ 6 bước đúng key + label", () => {
    expect(roadmapPinyinSteps.map((s) => s.label)).toEqual([
      "Thanh mẫu", "Vận mẫu đơn", "Vận mẫu ghép", "Thanh điệu", "Quy tắc đọc", "Tổng ôn pinyin",
    ]);
  });
  it("bước 1 đủ 23 phụ âm, bước 6 có links practice", () => {
    expect(roadmapPinyinSteps[0].initials).toHaveLength(23);
    expect(roadmapPinyinSteps[5].links).toEqual([
      { label: "Làm bài tập pinyin", href: "/pinyin/practice" },
      { label: "Xem lại bảng", href: "/pinyin" },
    ]);
  });
  it("nội dung khớp nguồn clone/js/data/roadmapPinyin.js (trừ links bổ sung)", () => {
    const src = readFileSync(resolve(__dirname, "../../../../clone/js/data/roadmapPinyin.js"), "utf8");
    const win: Record<string, any> = {};
    new Function("window", src)(win);
    const sourceSteps = win.NHAI_DATA.roadmapPinyin.steps;
    expect(roadmapPinyinSteps).toEqual(sourceSteps.map((s: any) => (s.key === "recap" ? { ...s, links: [{ label: "Làm bài tập pinyin", href: "/pinyin/practice" }, { label: "Xem lại bảng", href: "/pinyin" }] } : s)));
  });
});

describe("roadmapStages + roadmapCopy (chặng E1)", () => {
  it("6 chặng với desc + tags đúng SPEC-05 §1", () => {
    expect(roadmapStages.map((s) => [s.marker, s.book])).toEqual([
      ["拼音", "Pinyin"], ["1级", "HSK 1"], ["2级", "HSK 2"], ["3级", "HSK 3"], ["4–6级", "HSK 4–6"], ["7–9级", "HSK 7–9"],
    ]);
    expect(roadmapStages[1].desc).toBe("500 từ vựng đầu tiên, mẫu câu cơ bản, chào hỏi và giao tiếp đời thường.");
    expect(roadmapStages[1].tags).toEqual(["Từ vựng", "Ngữ pháp"]);
    expect(roadmapStages[5].tags).toEqual(["Từ vựng", "Nghe hiểu", "Luyện đề"]);
  });
  it("roadmapCopy đủ các chuỗi UI", () => {
    expect(roadmapCopy.atNow).toBe("Bạn đang ở: 拼音 · Bảng chữ cái Pinyin");
    expect(roadmapCopy.badge).toContain("Tính năng đang phát triển");
  });
});
