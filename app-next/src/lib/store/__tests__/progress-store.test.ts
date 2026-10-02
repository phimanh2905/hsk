import { describe, it, expect, beforeEach } from "vitest";
import { ProgressStore, progressStore } from "../progress-store";

const KEY = "nhai.pageDone";

beforeEach(() => localStorage.clear());

function fresh() {
  return new ProgressStore();
}

describe("XP / heat / pageDone", () => {
  it("addXp cộng dồn và đẩy event nhai:progress", () => {
    const s = fresh();
    s.addXp(3); s.addXp(2);
    expect(s.getXp()).toBe(5);
    const heat = JSON.parse(localStorage.getItem("nhai.heat")!);
    expect((Object.values(heat) as number[]).reduce((a, b) => a + b, 0)).toBe(5); // hôm nay cộng vào heat
    expect(localStorage.getItem("nhai.today")).toBe("5");
  });
  it("markPageDone ghi map <book>/<page>", () => {
    const s = fresh();
    s.markPageDone("hsk1", "lesson-1");
    expect(s.getPageDone("hsk1", "lesson-1")).toBe(true);
    expect(s.getPageDone("hsk1", "lesson-2")).toBe(false);
    expect(s.listPageDone("hsk1")).toEqual(["hsk1/lesson-1"]);
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)!))).toEqual(["hsk1/lesson-1"]);
  });
});

describe("SRS — toggle, batch, migration 3 format cũ", () => {
  it("toggleSrs thêm rồi bỏ, key chuẩn <book>.<page>.<index>", () => {
    const s = fresh();
    expect(s.toggleSrs("hsk1.lesson-1.0")).toBe(true);
    expect(s.getSrs("hsk1.lesson-1.0")?.status).toBe("new");
    expect(s.toggleSrs("hsk1.lesson-1.0")).toBe(false);
    expect(s.getSrs("hsk1.lesson-1.0")).toBeNull();
  });
  it("addSrsBatch bỏ qua key đã có (idempotent)", () => {
    const s = fresh();
    expect(s.addSrsBatch(["hsk1.lesson-1.0", "hsk1.lesson-1.1"])).toBe(2);
    expect(s.addSrsBatch(["hsk1.lesson-1.0", "hsk1.lesson-1.2"])).toBe(1);
  });
  it("migrateLegacySrs gộp format 1 (nhai.srs.w.*) + format 2 (nhai.srs.st JSON) + format 3 (nhai.srs.st.<k>/t.<k>)", () => {
    localStorage.setItem("nhai.srs.w.hsk1.lesson-1.0", "1");
    localStorage.setItem("nhai.srs.st", JSON.stringify({ "hsk1.lesson-1.1": "learning" }));
    localStorage.setItem("nhai.srs.st.hsk1.lesson-1.2", "learned");
    localStorage.setItem("nhai.srs.t.hsk1.lesson-1.2", String(Date.now() - 1000));
    const s = fresh();
    s.migrateLegacySrs();
    expect(s.getSrs("hsk1.lesson-1.0")?.status).toBe("new");
    expect(s.getSrs("hsk1.lesson-1.1")?.status).toBe("learning");
    expect(s.getSrs("hsk1.lesson-1.2")?.status).toBe("learned");
    expect(s.getSrs("hsk1.lesson-1.2")?.lastReviewedAt).toBeGreaterThan(0);
  });
});

describe("battle best + roadmap", () => {
  it("saveBattleBest giữ max correct rồi min time", () => {
    const s = fresh();
    expect(s.saveBattleBest("hsk1.lesson-1", 10, 30_000)).toBe(true);
    expect(s.saveBattleBest("hsk1.lesson-1", 12, 40_000)).toBe(true); // nhiều đúng hơn
    expect(s.saveBattleBest("hsk1.lesson-1", 12, 25_000)).toBe(true); // bằng điểm, nhanh hơn
    expect(s.saveBattleBest("hsk1.lesson-1", 9, 10_000)).toBe(false); // kém hơn
    expect(s.getBattleBest("hsk1.lesson-1")).toEqual({ correct: 12, timeMs: 25_000 });
    expect(localStorage.getItem("nhai.battle.best.hsk1.lesson-1")).toBe(JSON.stringify({ correct: 12, timeMs: 25_000 }));
  });
  it("roadmap done lưu mảng buổi", () => {
    const s = fresh();
    s.markRoadmapSession(1);
    s.markRoadmapSession(2);
    expect(s.getRoadmapDone()).toEqual([1, 2]);
  });
});

describe("feedback (contract plan sp1-social-legal)", () => {
  it("appendFeedback/getFeedback, trả [] khi rỗng/hỏng JSON", () => {
    const s = fresh();
    expect(s.getFeedback()).toEqual([]);
    localStorage.setItem("nhai.feedback", "{broken");
    expect(s.getFeedback()).toEqual([]);
    s.appendFeedback({ text: "Ổn!", at: new Date().toISOString() });
    expect(s.getFeedback()).toEqual([{ text: "Ổn!", at: expect.any(String) }]);
  });
});

describe("getToday + roadmap learnSeen (fix wave 2026-10-01)", () => {
  beforeEach(() => localStorage.clear());

  it("getToday đọc nhai.today, mặc định 0 khi rỗng/hỏng", () => {
    expect(progressStore.getToday()).toBe(0);
    localStorage.setItem("nhai.today", "7");
    expect(progressStore.getToday()).toBe(7);
    localStorage.setItem("nhai.today", "{broken");
    expect(progressStore.getToday()).toBe(0);
  });

  it("getRoadmapLearnSeen đọc qua store (không đọc localStorage ở component)", () => {
    expect(progressStore.getRoadmapLearnSeen()).toEqual([]);
    localStorage.setItem("nhai.roadmap.learnSeen", JSON.stringify([2, 1, "x"]));
    // bỏ phần tử không phải số
    expect(progressStore.getRoadmapLearnSeen()).toEqual([2, 1]);
  });

  it("markRoadmapLearnSeen thêm duy nhất, sort tăng, phát event nhai:progress", () => {
    const events: string[] = [];
    window.addEventListener("nhai:progress", () => events.push("evt"));
    progressStore.markRoadmapLearnSeen(3);
    progressStore.markRoadmapLearnSeen(1);
    progressStore.markRoadmapLearnSeen(3);
    expect(localStorage.getItem("nhai.roadmap.learnSeen")).toBe("[1,3]");
    expect(progressStore.getRoadmapLearnSeen()).toEqual([1, 3]);
    expect(events.length).toBe(2);
    window.removeEventListener("nhai:progress", () => events.push("evt"));
  });
});
