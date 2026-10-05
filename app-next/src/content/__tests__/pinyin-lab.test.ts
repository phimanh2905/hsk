// app-next/src/content/__tests__/pinyin-lab.test.ts
import { describe, it, expect } from "vitest";
import {
  PINYIN_LAB_GROUPS, PINYIN_LAB_DESC, PINYIN_LAB_TIP, PINYIN_LAB_BASE,
  PINYIN_LAB_TONES, PINYIN_LAB_FINALS, PINYIN_LAB_GROUP_OF,
  PINYIN_LAB_SANDHI, PINYIN_LAB_TONE_CARDS,
} from "../pinyin-lab";

describe("PINYIN_LAB data (port mock)", () => {
  it("GROUPS: 7 nhóm, đủ 23 thanh mẫu không trùng; GROUP_OF phủ hết", () => {
    const all = PINYIN_LAB_GROUPS.flatMap((g) => g.items);
    expect(PINYIN_LAB_GROUPS.length).toBe(7);
    expect(all.length).toBe(23);
    expect(new Set(all).size).toBe(23);
    for (const x of all) expect(PINYIN_LAB_GROUP_OF[x], x).toBeTruthy();
  });

  it("DESC/TIP/BASE đủ 23 âm; TONES 23 âm × 4 hàng [py, zh, vi]", () => {
    const all = PINYIN_LAB_GROUPS.flatMap((g) => g.items);
    for (const x of all) {
      expect(PINYIN_LAB_DESC[x], `desc ${x}`).toBeTruthy();
      expect(PINYIN_LAB_TIP[x], `tip ${x}`).toBeTruthy();
      expect(PINYIN_LAB_BASE[x], `base ${x}`).toBeTruthy();
      expect(PINYIN_LAB_TONES[x], `tones ${x}`).toHaveLength(4);
      for (const row of PINYIN_LAB_TONES[x]) expect(row).toHaveLength(3);
    }
  });

  it("TONES: tổng 92 hàng, mỗi âm đủ 4 py khác nhau", () => {
    const rows = Object.values(PINYIN_LAB_TONES).flat();
    expect(rows.length).toBe(92);
    for (const rowsOfOne of Object.values(PINYIN_LAB_TONES)) {
      expect(new Set(rowsOfOne.map((r) => r[0])).size).toBe(4);
    }
  });

  it("FINALS: đúng 4 nhóm label mock, đủ 36 item dạng [py, '<Hán> <pinyin>']", () => {
    const all = PINYIN_LAB_FINALS.flatMap((g) => g.items);
    expect(PINYIN_LAB_FINALS.map((g) => g.label)).toEqual([
      "Đơn · Nguyên âm đơn", "Kép · Nguyên âm đôi", "Mũi · Âm mũi", "Đặc biệt",
    ]);
    expect(all.length).toBe(36);
    for (const [, ex] of all) expect(ex.split(" ").length).toBe(2);
  });

  it("SANDHI: 3 quy tắc, mỗi rule ≥ 3 ví dụ [py, zh, vi]", () => {
    expect(PINYIN_LAB_SANDHI.length).toBe(3);
    for (const r of PINYIN_LAB_SANDHI) {
      expect(r.t).toBeTruthy();
      expect(r.d).toBeTruthy();
      expect(r.ex.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("TONE_CARDS: 4 card mā má mǎ mà + contour flat/up/dip/down", () => {
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.ex.py)).toEqual(["mā", "má", "mǎ", "mà"]);
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.contour)).toEqual(["flat", "up", "dip", "down"]);
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.name)).toEqual([
      "Thanh 1 (55)", "Thanh 2 (35)", "Thanh 3 (214)", "Thanh 4 (51)",
    ]);
  });
});
