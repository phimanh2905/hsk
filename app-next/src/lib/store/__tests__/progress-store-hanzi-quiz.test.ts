import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore hanzi quiz", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("chưa luyện → getHanziQuiz trả null, listHanziQuiz trả {}", () => {
    expect(progressStore.getHanziQuiz("水")).toBeNull();
    expect(progressStore.listHanziQuiz()).toEqual({});
  });

  it("recordHanziQuiz lần 1: attempts=1, last>0, best=0 khi không truyền score", () => {
    progressStore.recordHanziQuiz("水");
    const rec = progressStore.getHanziQuiz("水");
    expect(rec).not.toBeNull();
    expect(rec!.attempts).toBe(1);
    expect(rec!.best).toBe(0);
    expect(rec!.last).toBeGreaterThan(0);
  });

  it("recordHanziQuiz nhiều lần: attempts tăng, last cập nhật, best giữ max score", () => {
    progressStore.recordHanziQuiz("水", 60);
    expect(progressStore.getHanziQuiz("水")!.best).toBe(60);
    progressStore.recordHanziQuiz("水", 40); // thấp hơn → best giữ 60
    const mid = progressStore.getHanziQuiz("水")!;
    expect(mid.attempts).toBe(2);
    expect(mid.best).toBe(60);
    progressStore.recordHanziQuiz("水", 90);
    const rec = progressStore.getHanziQuiz("水")!;
    expect(rec!.attempts).toBe(3);
    expect(rec!.best).toBe(90);
    expect(rec!.last).toBeGreaterThanOrEqual(mid.last);
  });

  it("listHanziQuiz trả map theo chữ; chữ khác tách record riêng", () => {
    progressStore.recordHanziQuiz("水");
    progressStore.recordHanziQuiz("火", 50);
    const all = progressStore.listHanziQuiz();
    // sort theo code unit: 水 (U+6C34) < 火 (U+706B)
    expect(Object.keys(all).sort()).toEqual(["水", "火"]);
    expect(all["火"].best).toBe(50);
    expect(all["水"].best).toBe(0);
  });

  it("JSON hỏng trong localStorage → trả mặc định, không throw", () => {
    localStorage.setItem("bye.hanzi.quiz", "{oops");
    expect(progressStore.listHanziQuiz()).toEqual({});
    expect(progressStore.getHanziQuiz("水")).toBeNull();
  });

  it("record vào key JSON hỏng → tự ghi lại từ {}", () => {
    localStorage.setItem("bye.hanzi.quiz", "not-json");
    progressStore.recordHanziQuiz("口");
    expect(progressStore.getHanziQuiz("口")!.attempts).toBe(1);
  });
});
