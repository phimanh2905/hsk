import { describe, it, expect } from "vitest";
import {
  roadmapLevels,
  getRoadmapLevel,
  buildLevelStations,
} from "../roadmap-stations";
import type { GeneratedLesson } from "../roadmap-generated";

describe("buildLevelStations", () => {
  const mk = (i: number): GeneratedLesson => ({ book: "hsk1", page: `lesson-${i}`, title: `Bài ${i}`, wordCount: 15 });
  it("27 bài → 6 trạm lesson (5+5+5+5+5+2) + milestone cuối = 7 trạm", () => {
    const lessons = Array.from({ length: 27 }, (_, i) => mk(i + 1));
    const stations = buildLevelStations(lessons);
    expect(stations).toHaveLength(7);
    const lessonStations = stations.filter((s) => s.kind === "lesson");
    expect(lessonStations).toHaveLength(6);
    expect(lessonStations.map((s) => s.lessons!.length)).toEqual([5, 5, 5, 5, 5, 2]);
    expect(stations[6].kind).toBe("milestone");
    expect(lessonStations[0].id).toBe("g1");
    expect(stations[6].id).toBe("milestone");
    expect(lessonStations[0].lessons![0]).toEqual({ book: "hsk1", page: "lesson-1" });
    expect(lessonStations[0].title).toBe("Bài 1");
  });
});

describe("roadmapLevels v2", () => {
  it("8 level đúng thứ tự và trạng thái", () => {
    expect(roadmapLevels.map((l) => l.id)).toEqual(
      ["pinyin", "hsk-1", "hsk-2", "hsk-3", "hsk-4", "hsk-5", "hsk-6", "hsk-7-9"],
    );
    expect(getRoadmapLevel("pinyin")!.status).toBe("available");
    expect(getRoadmapLevel("hsk-1")!.stations.filter((s) => s.kind === "lesson")).toHaveLength(6);
    expect(getRoadmapLevel("hsk-3")!.status).toBe("available");
    expect(getRoadmapLevel("hsk-6")!.status).toBe("upcoming");
    expect(getRoadmapLevel("hsk-7-9")!.status).toBe("upcoming");
  });
  it("hsk-2: giữ 7 trạm curated (ids 1..6,m) + nhóm bổ sung sau Trạm 6, phủ đủ 40 bài, không trùng lesson curated", () => {
    const hsk2 = getRoadmapLevel("hsk-2")!;
    const curated = hsk2.stations.filter((s) => !s.id.startsWith("b"));
    expect(curated.map((s) => s.id)).toEqual(["1", "2", "3", "4", "5", "m", "6"]);
    const allLessons = hsk2.stations.flatMap((s) => s.lessons ?? []);
    expect(new Set(allLessons.map((l) => l.page)).size).toBe(40);
    // trạm bổ sung nằm sau Trạm 6 trong mảng
    const idx6 = hsk2.stations.findIndex((s) => s.id === "6");
    expect(hsk2.stations.slice(idx6 + 1).every((s) => s.id.startsWith("b"))).toBe(true);
  });
});

describe("roadmap-stations content", () => {
  it("pinyin banner-only (stations rỗng, available), hsk-6 + hsk-7-9 upcoming", () => {
    expect(getRoadmapLevel("pinyin")!.stations).toHaveLength(0);
    expect(getRoadmapLevel("hsk-6")!.status).toBe("upcoming");
    expect(getRoadmapLevel("hsk-7-9")!.status).toBe("upcoming");
  });
  it("hsk-1/hsk-3/hsk-4/hsk-5 available và có trạm generator", () => {
    for (const id of ["hsk-1", "hsk-3", "hsk-4", "hsk-5"] as const) {
      const level = getRoadmapLevel(id)!;
      expect(level.status).toBe("available");
      expect(level.stations.filter((s) => s.kind === "lesson").length).toBeGreaterThan(0);
    }
  });
  it("trạm curated hsk-2 đều có vocab + grammar không rỗng (trạm generator để rỗng, Task 9 render)", () => {
    const hsk2 = getRoadmapLevel("hsk-2")!;
    const curatedIds = new Set(["1", "2", "3", "4", "5", "m", "6"]);
    for (const s of hsk2.stations) {
      if (!curatedIds.has(s.id)) continue;
      expect(s.vocab.length).toBeGreaterThan(0);
      expect(s.gram.length).toBeGreaterThan(0);
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
