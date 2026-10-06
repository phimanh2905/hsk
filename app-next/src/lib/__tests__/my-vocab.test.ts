// app-next/src/lib/__tests__/my-vocab.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildVocabIndex } from "../my-vocab";
import type { SrsItem, DeckItem, VocabBookEntry } from "@/lib/store/progress-store";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function srs(key: string, status: SrsItem["status"], lastReviewedAt: number | null, dueAt = NOW + DAY): SrsItem {
  return { key, status, dueAt, reviewCount: 1, lastReviewedAt, updatedAt: NOW };
}
const deck = (id: string, rows: DeckItem["rows"]): DeckItem => ({ id, name: "Deck " + id, rows, updatedAt: new Date(NOW).toISOString() });

/* seed deck cho SRS key deck.nb-1.0 (resolveWord đọc progressStore) */
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bye.decks", JSON.stringify([deck("nb-1", [
    { hanzi: "时间", pinyin: "shíjiān", hanviet: "THỜI GIAN", meaning: "thời gian" },
  ])]));
});

const BASE = { srs: [] as SrsItem[], decks: [] as DeckItem[], vocabBook: [] as VocabBookEntry[], meta: {}, now: NOW };

describe("buildVocabIndex (Review Focus #1 — hợp nhất 3 nguồn)", () => {
  it("SRS key deck → row đúng py/hv? không — py/vi từ resolveWord, hsk từ key, deck row bổ sung hv", () => {
    const idx = buildVocabIndex({
      ...BASE,
      srs: [srs("deck.nb-1.0", "learning", NOW - 2 * DAY)],
      decks: [deck("nb-1", [{ hanzi: "时间", pinyin: "shíjiān", hanviet: "THỜI GIAN", meaning: "thời gian" }])],
    });
    expect(idx.rows).toHaveLength(1);
    const r = idx.rows[0];
    expect(r.zh).toBe("时间");
    expect(r.py).toBe("shíjiān");
    expect(r.hv).toBe("THỜI GIAN");
    expect(r.vi).toBe("thời gian");
    expect(r.hsk).toBe("HSK 2"); // srsLevelFromKey deck.* → HSK 2
    expect(r.status).toBe("study");
    expect(r.last).toBe("2 ngày trước");
    expect(r.hasSrs).toBe(true);
    expect(r.deckIds).toEqual(["nb-1"]);
  });

  it("dedupe theo zh, first-wins py/vi theo thứ tự SRS → decks → vocabBook; deckIds gộp", () => {
    /* contingency: hsk1.lesson-1.0 → "你好" (không phải "你") → dùng deck key theo brief Step 4 */
    localStorage.setItem("bye.decks", JSON.stringify([
      ...JSON.parse(localStorage.getItem("bye.decks")!),
      deck("nb-2", [{ hanzi: "你", pinyin: "nǐ", hanviet: "NHĨ", meaning: "bạn (từ SRS)" }]),
    ]));
    const idx = buildVocabIndex({
      ...BASE,
      srs: [srs("deck.nb-2.0", "known", NOW - DAY)],
      decks: [deck("nb-2", [{ hanzi: "你", pinyin: "nǐ", hanviet: "NHĨ", meaning: "bạn (đè bởi SRS)" }])],
      vocabBook: [{ hanzi: "你", pinyin: "nǐ", vi: "bạn" }],
    });
    expect(idx.rows).toHaveLength(1);
    const r = idx.rows[0];
    expect(r.status).toBe("master"); // known → master
    expect(r.vi).toBe("bạn (từ SRS)"); // first-wins: SRS meaning giữ nguyên, deck không đè
    expect(r.hsk).toBe("HSK 2"); // deck.* → HSK 2 (contingency brief Step 4)
    expect(r.deckIds).toEqual(["nb-2"]);
  });

  it("từ chỉ có trong deck: status new, hsk '—', hasSrs false (Review Focus #1)", () => {
    const idx = buildVocabIndex({ ...BASE, decks: [deck("nb-3", [{ hanzi: "朋友" }])] });
    const r = idx.rows[0];
    expect(r.status).toBe("new");
    expect(r.hsk).toBe("—");
    expect(r.hasSrs).toBe(false);
    expect(r.last).toBe("Chưa ôn");
  });

  it("Review Focus #2: SRS key không resolve được → bỏ qua, không crash", () => {
    const idx = buildVocabIndex({ ...BASE, srs: [srs("deck.nb-xoá.9", "new", null)] });
    expect(idx.rows).toHaveLength(0);
  });
});

describe("hero metrics", () => {
  it("dueCount = hasSrs && status !== master; learned/known đều là master", () => {
    const idx = buildVocabIndex({
      ...BASE,
      srs: [
        srs("hsk1.lesson-1.0", "known", NOW - DAY),
        srs("hsk1.lesson-1.1", "learning", NOW - DAY),
        srs("hsk1.lesson-1.2", "learned", NOW - DAY),
      ],
      decks: [deck("nb-4", [{ hanzi: "朋友" }])],
    });
    expect(idx.dueCount).toBe(1); // chỉ learning
  });

  it("mastery weighted (master 1 / study .5 / new 0), list rỗng → 0", () => {
    const idx = buildVocabIndex({
      ...BASE,
      srs: [
        srs("hsk1.lesson-1.0", "known", NOW - DAY),
        srs("hsk1.lesson-1.1", "learning", NOW - DAY),
      ],
      decks: [deck("nb-4", [{ hanzi: "朋友" }])],
    });
    expect(idx.mastery).toBe(50);
    expect(buildVocabIndex(BASE).mastery).toBe(0);
  });

  it("hskTarget = level cao nhất; rỗng → null", () => {
    const idx = buildVocabIndex({
      ...BASE,
      srs: [srs("hsk3.lesson-1.0", "learning", null), srs("hsk1.lesson-1.0", "known", NOW - DAY)],
    });
    expect(idx.hskTarget).toBe("HSK 3");
    expect(buildVocabIndex(BASE).hskTarget).toBeNull();
  });

  it("meta áp star/note vào row", () => {
    const idx = buildVocabIndex({
      ...BASE,
      vocabBook: [{ hanzi: "爱", pinyin: "ài", vi: "yêu" }],
      meta: { 爱: { star: 1, note: "mẹo riêng" } },
    });
    expect(idx.rows[0].star).toBe(true);
    expect(idx.rows[0].note).toBe("mẹo riêng");
  });
});
