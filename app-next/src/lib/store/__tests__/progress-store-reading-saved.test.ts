import { describe, it, expect, beforeEach } from "vitest";
import { progressStore, type SavedReadingDraft } from "../progress-store";

const draft = (over: Partial<SavedReadingDraft> = {}): SavedReadingDraft => ({
  id: "rd_000000000001",
  title: "Bài một",
  textZh: "我喜欢学中文。",
  doc: {
    sentences: [{ zh: "我喜欢学中文。", py: "wǒ xǐhuan xué zhōngwén.", vi: "Tôi thích học tiếng Trung." }],
    vocab: [{ word: "喜欢", py: "xǐhuan", vi: "thích" }],
    questions: [{ q: "谁喜欢学中文？", qVi: "Ai thích học tiếng Trung?", options: ["我", "他"], answer: 0 }],
  },
  chars: 7,
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

describe("progressStore saved reading drafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("không có draft → getReadingDrafts trả []", () => {
    expect(progressStore.getReadingDrafts()).toEqual([]);
  });

  it("upsert mới → push cuối; upsert cùng id → ghi đè", () => {
    progressStore.upsertReadingDraft(draft());
    progressStore.upsertReadingDraft(draft({ id: "rd_000000000002", title: "Bài hai" }));
    let drafts = progressStore.getReadingDrafts();
    expect(drafts.map((d) => d.id)).toEqual(["rd_000000000001", "rd_000000000002"]);

    progressStore.upsertReadingDraft(draft({ id: "rd_000000000001", title: "Bài một (sửa)", updatedAt: 2000 }));
    drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts.find((d) => d.id === "rd_000000000001")?.title).toBe("Bài một (sửa)");
  });

  it("record lạ (thiếu doc/chars) → bị lọc khi đọc", () => {
    const weird = [{ id: "x" }, null, 42, draft(), { ...draft(), doc: undefined }] as unknown as SavedReadingDraft[];
    localStorage.setItem("nhai.reading.drafts2", JSON.stringify(weird));
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].id).toBe("rd_000000000001");
  });

  it("removeReadingDraft → tombstone: get lọc bỏ, raw còn giữ", () => {
    progressStore.upsertReadingDraft(draft());
    progressStore.removeReadingDraft("rd_000000000001");
    expect(progressStore.getReadingDrafts()).toEqual([]);
    const raw = JSON.parse(localStorage.getItem("nhai.reading.drafts2") ?? "[]") as SavedReadingDraft[];
    expect(raw.length).toBe(1);
    expect(typeof raw[0].deletedAt).toBe("number");
  });

  it("remove rồi upsert lại cùng id → sống lại (deletedAt bị xóa)", () => {
    progressStore.upsertReadingDraft(draft());
    progressStore.removeReadingDraft("rd_000000000001");
    progressStore.upsertReadingDraft(draft({ updatedAt: 3000 }));
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].deletedAt).toBeUndefined();
    expect(drafts[0].updatedAt).toBe(3000);
  });

  it("giữ tối đa 100 tombstone — cũ nhất bị purge", () => {
    for (let i = 0; i < 105; i++) {
      progressStore.upsertReadingDraft(draft({ id: `rd_${String(i).padStart(12, "0")}`, updatedAt: 1000 + i }));
      progressStore.removeReadingDraft(`rd_${String(i).padStart(12, "0")}`);
    }
    const raw = JSON.parse(localStorage.getItem("nhai.reading.drafts2") ?? "[]") as SavedReadingDraft[];
    expect(raw.length).toBe(100);
    // 5 tombstone cũ nhất (rd_000..0004) đã bị purge
    expect(raw.some((d) => d.id === "rd_000000000000")).toBe(false);
    expect(raw.some((d) => d.id === "rd_000000000004")).toBe(false);
    expect(raw.some((d) => d.id === "rd_000000000005")).toBe(true);
  });
});
