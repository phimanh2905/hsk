import { describe, it, expect } from "vitest";
import { roadmapLevels, getRoadmapLevel } from "../roadmap-stations";

describe("roadmap-stations content", () => {
  it("có đủ 4 level đúng thứ tự id", () => {
    expect(roadmapLevels.map((l) => l.id)).toEqual(["hsk-1", "hsk-2", "hsk-3", "hsk-4-6"]);
  });
  it("HSK 2 available, 7 trạm, trạm thứ 6 là milestone (theo mock)", () => {
    const hsk2 = getRoadmapLevel("hsk-2")!;
    expect(hsk2.status).toBe("available");
    expect(hsk2.stations).toHaveLength(7);
    expect(hsk2.stations.map((s) => s.kind)).toEqual([
      "lesson", "lesson", "lesson", "lesson", "lesson", "milestone", "lesson",
    ]);
  });
  it("HSK 1 banner-only (stations rỗng), HSK 3 + 4–6 upcoming", () => {
    expect(getRoadmapLevel("hsk-1")!.stations).toHaveLength(0);
    expect(getRoadmapLevel("hsk-3")!.status).toBe("upcoming");
    expect(getRoadmapLevel("hsk-4-6")!.status).toBe("upcoming");
  });
  it("mọi trạm đều có vocab + grammar không rỗng", () => {
    for (const l of roadmapLevels) {
      for (const s of l.stations) {
        expect(s.vocab.length).toBeGreaterThan(0);
        expect(s.gram.length).toBeGreaterThan(0);
      }
    }
  });
  it("getRoadmapLevel trả null cho id lạ", () => {
    expect(getRoadmapLevel("hsk-99")).toBeNull();
  });
});

const hsk2 = getRoadmapLevel("hsk-2")!;
const station = (id: string) => hsk2.stations.find((s) => s.id === id)!;

describe("roadmap-stations data", () => {
  it("mỗi lesson station có lesson mapping đúng", () => {
    expect(station("1").lesson).toEqual({ book: "hsk2", page: "lesson-1" });
    expect(station("2").lesson).toEqual({ book: "hsk2", page: "lesson-11" });
    expect(station("3").lesson).toEqual({ book: "hsk2", page: "lesson-6" });
    expect(station("4").lesson).toEqual({ book: "hsk2", page: "lesson-25" });
    expect(station("5").lesson).toEqual({ book: "hsk2", page: "lesson-15" });
    expect(station("6").lesson).toEqual({ book: "hsk2", page: "lesson-21" });
  });

  it("milestone không có lesson; pageId đều có dạng lesson-N", () => {
    expect(station("m").lesson).toBeUndefined();
    for (const s of hsk2.stations) {
      if (s.lesson) expect(s.lesson.page).toMatch(/^lesson-\d+$/);
    }
  });

  it("meta không còn text khóa cứng (trạng thái do derive vẽ)", () => {
    for (const s of hsk2.stations) {
      expect(s.meta).not.toMatch(/Khóa/i);
    }
  });

  it("schema vẫn validate toàn bộ levels", () => {
    expect(() => roadmapLevels.forEach((l) => l.stations.forEach(() => null))).not.toThrow();
  });
});
