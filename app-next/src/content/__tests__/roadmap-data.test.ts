import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { roadmapSessions } from "../roadmap";
import { roadmapPinyinSteps } from "../roadmapPinyin";

type SrcTestItem = { prompt?: string; answer: string; q?: string; options?: string[]; explain?: string };
type SrcSession = {
  n: number; title: string; minutes: number; desc: string;
  learn: unknown; cards: unknown; quiz: unknown; test: SrcTestItem[];
};
type SrcStep = { key: string } & Record<string, unknown>;
function loadSource<T>(file: string, pick: (root: { NHAI_DATA: NhaiSourceData }) => T): T {
  const src = readFileSync(resolve(__dirname, "../../../../clone/js/data/" + file), "utf8");
  const win: Record<string, unknown> = {};
  new Function("window", src)(win);
  return pick(win as unknown as { NHAI_DATA: NhaiSourceData });
}
type NhaiSourceData = {
  roadmap: { pinyin: { sessions: SrcSession[] } };
  roadmapPinyin: { steps: SrcStep[] };
};

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
    const sourceSessions = loadSource("roadmap.js", (r) => r.NHAI_DATA.roadmap.pinyin.sessions);
    expect(roadmapSessions.map((s) => JSON.stringify([s.n, s.title, s.minutes, s.desc, s.learn, s.cards, s.quiz]))).toEqual(
      sourceSessions.map((s) => JSON.stringify([s.n, s.title, s.minutes, s.desc, s.learn, s.cards, s.quiz])),
    );
    for (let i = 0; i < sourceSessions.length; i++) {
      expect(roadmapSessions[i].test).toEqual(
        sourceSessions[i].test.map((t) =>
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
    const sourceSteps = loadSource("roadmapPinyin.js", (r) => r.NHAI_DATA.roadmapPinyin.steps);
    expect(roadmapPinyinSteps).toEqual(sourceSteps.map((s) => (s.key === "recap" ? { ...s, links: [{ label: "Làm bài tập pinyin", href: "/pinyin/practice" }, { label: "Xem lại bảng", href: "/pinyin" }] } : s)));
  });
});
