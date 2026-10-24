import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore reading drafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("không có draft → getReadingDrafts trả []", () => {
    expect(progressStore.getReadingDrafts()).toEqual([]);
  });

  it("saveReadingDraft: thêm đầu mảng, mới nhất trước", () => {
    progressStore.saveReadingDraft("第一篇");
    progressStore.saveReadingDraft("第二篇");
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts[0].text).toBe("第二篇");
    expect(drafts[1].text).toBe("第一篇");
    expect(drafts[0].at).toBeTruthy();
  });

  it("text rỗng hoặc chỉ whitespace → bỏ qua", () => {
    progressStore.saveReadingDraft("   ");
    progressStore.saveReadingDraft("");
    expect(progressStore.getReadingDrafts()).toEqual([]);
  });

  it("dán lại đúng bài gần nhất (trim bằng nhau) → không nhân bản", () => {
    progressStore.saveReadingDraft("同一个内容");
    progressStore.saveReadingDraft("  同一个内容  ");
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].text).toBe("同一个内容");
  });

  it("giữ tối đa 5 draft, cũ nhất bị đẩy ra", () => {
    for (let i = 1; i <= 7; i++) progressStore.saveReadingDraft(`bài ${i}`);
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(5);
    expect(drafts[0].text).toBe("bài 7");
    expect(drafts[4].text).toBe("bài 3");
  });
});
