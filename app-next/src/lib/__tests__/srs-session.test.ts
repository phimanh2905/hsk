import { describe, it, expect, beforeEach } from "vitest";
import { buildQueue, srsLevelFromKey, formatLastLabel, resolveWord } from "../srs-session";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";
import { vocab } from "@/content/vocab";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

beforeEach(() => localStorage.clear());

function item(key: string, over: Partial<SrsItem> = {}): SrsItem {
  return { key, status: "new", dueAt: NOW, reviewCount: 0, lastReviewedAt: null, updatedAt: NOW, ...over };
}

describe("srsLevelFromKey", () => {
  it("hsk1/hsk3 prefix → HSK N; deck.* → HSK 2", () => {
    expect(srsLevelFromKey("hsk1.lesson-1.0")).toBe("HSK 1");
    expect(srsLevelFromKey("hsk3.lesson-2.5")).toBe("HSK 3");
    expect(srsLevelFromKey("deck.abc.0")).toBe("HSK 2");
  });
});

describe("formatLastLabel", () => {
  it("null → Chưa ôn; hôm nay / hôm qua / N ngày trước", () => {
    expect(formatLastLabel(null, NOW)).toBe("Chưa ôn");
    expect(formatLastLabel(NOW - 3600_000, NOW)).toBe("Hôm nay");
    expect(formatLastLabel(NOW - 1 * DAY, NOW)).toBe("Hôm qua");
    expect(formatLastLabel(NOW - 3 * DAY, NOW)).toBe("3 ngày trước");
  });
});

describe("resolveWord", () => {
  it("key vocab → word từ content/vocab", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const w = vocab[book][page].words[0];
    const r = resolveWord(`${book}.${page}.0`);
    expect(r).toEqual({ zh: w.hanzi, pinyin: w.pinyin, meaning: w.meaning });
  });
  it("key không tồn tại → null", () => {
    expect(resolveWord("hsk9.khong-ton-tai.999")).toBeNull();
    expect(resolveWord("rác")).toBeNull();
  });
  it("key deck → row từ progressStore decks", () => {
    const deck = progressStore.createDeck("vocab", "Deck test");
    const decks = JSON.parse(localStorage.getItem("bye.decks")!);
    decks[0].rows = [{ hanzi: "爱", pinyin: "ài", meaning: "Yêu" }];
    localStorage.setItem("bye.decks", JSON.stringify(decks));
    expect(resolveWord(`deck.${deck.id}.0`)).toEqual({ zh: "爱", pinyin: "ài", meaning: "Yêu" });
    expect(resolveWord(`deck.${deck.id}.7`)).toBeNull();
  });
});

describe("buildQueue", () => {
  it("lọc theo level + loại key không resolve", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const key = `${book}.${page}.0`;
    const items = [item(key), item("hsk1.xxx.999"), item("hsk2.lesson-1.0")];
    const queue = buildQueue(items, srsLevelFromKey(key), NOW);
    expect(queue.map((w) => w.key)).toEqual([key]);
    expect(queue[0].zh.length).toBeGreaterThan(0);
    expect(queue[0].mem).toBe(25);
    expect(queue[0].isNew).toBe(true);
  });
  it("đến hạn trước, chưa hạn sau; cùng nhóm sort theo key", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const a = `${book}.${page}.0`, b = `${book}.${page}.1`, c = `${book}.${page}.2`;
    const items = [
      item(b, { status: "learning", dueAt: NOW + DAY }),   // chưa hạn
      item(a, { status: "learning", dueAt: NOW - DAY }),   // đến hạn
      item(c, { status: "learning", dueAt: NOW - 2 * DAY }), // đến hạn
    ];
    const queue = buildQueue(items, "HSK 1", NOW);
    // 2 item đến hạn sort theo key: a ("...0") trước c ("...2"); b chưa hạn sau
    expect(queue.map((w) => w.key)).toEqual([a, c, b]);
  });
  it("queue rỗng khi không có item nào khớp", () => {
    expect(buildQueue([], "HSK 2", NOW)).toEqual([]);
  });
});
