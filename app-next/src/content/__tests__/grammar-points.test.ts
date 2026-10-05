// app-next/src/content/__tests__/grammar-points.test.ts
import { describe, it, expect } from "vitest";
import { GRAMMAR_POINTS, GRAMMAR_TOPICS, GRAMMAR_LEVELS } from "../grammar-points";

describe("GRAMMAR_POINTS (port mock 6 điểm)", () => {
  it("đủ 6 điểm đúng id/thứ tự; level/topic hợp lệ", () => {
    expect(GRAMMAR_POINTS.map((p) => p.id)).toEqual(["ba", "bi", "lian", "bongu", "bei", "yue"]);
    const levels = GRAMMAR_LEVELS.filter((l) => l !== "all");
    for (const p of GRAMMAR_POINTS) {
      expect(levels, p.id).toContain(p.level);
      expect(["ba", "bi", "bongu", "hutu"], p.id).toContain(p.topic);
    }
  });

  it("mỗi điểm: def, formula ≥ 2 blocks (≥ 1 key), pitfall [bold, rest] không rỗng, ex ≥ 1", () => {
    for (const p of GRAMMAR_POINTS) {
      expect(p.def.length, p.id).toBeGreaterThan(10);
      expect(p.formula.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.formula.some(([, k]) => k === "key"), `formula key ${p.id}`).toBe(true);
      expect(p.pitfall.length, `pitfall 3 phần ${p.id}`).toBe(3);
      expect(p.pitfall[1].length, `pit bold ${p.id}`).toBeGreaterThan(3);
      expect(p.pitfall[2].length, `pit rest ${p.id}`).toBeGreaterThan(3);
      expect(p.ex.length, p.id).toBeGreaterThanOrEqual(1);
      for (const e of p.ex) {
        expect(e.hz).toBeTruthy();
        expect(e.py).toBeTruthy();
        expect(e.vi).toBeTruthy();
      }
    }
  });

  it("pitfall 3 phần ghép lại đúng câu mock (Review Focus #1)", () => {
    const concat = (p: (typeof GRAMMAR_POINTS)[number]) => p.pitfall[0] + p.pitfall[1] + p.pitfall[2];
    const ba = GRAMMAR_POINTS.find((p) => p.id === "ba")!;
    expect(concat(ba)).toBe("Động từ không được đứng đơn độc sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác.");
    const bi = GRAMMAR_POINTS.find((p) => p.id === "bi")!;
    expect(concat(bi)).toBe("Không thêm 很 / 非常 trước tính từ trong câu 比 — mức độ nằm ở phần số lượng.");
    const lian = GRAMMAR_POINTS.find((p) => p.id === "lian")!;
    expect(concat(lian)).toBe("连 phải đi với 也 hoặc 都 — thiếu là sai cấu trúc, người Việt hay bỏ quên.");
  });

  it("ví dụ port đúng mock (3 câu chốt)", () => {
    expect(GRAMMAR_POINTS[0].ex[0]).toEqual({ hz: "请把书打开。", py: "Qǐng bǎ shū dǎkāi.", vi: "Xin hãy mở sách ra." });
    expect(GRAMMAR_POINTS[1].ex[0]).toEqual({ hz: "他比我高五厘米。", py: "Tā bǐ wǒ gāo wǔ límǐ.", vi: "Anh ấy cao hơn tôi 5 cm." });
    expect(GRAMMAR_POINTS[5].ex[0]).toEqual({ hz: "越学越有意思。", py: "Yuè xué yuè yǒu yìsi.", vi: "Càng học càng thấy thú vị." });
  });

  it("GRAMMAR_TOPICS đủ 6 mục (all + 4 topic + saved); GRAMMAR_LEVELS đủ 7", () => {
    expect(GRAMMAR_TOPICS.map(([k]) => k)).toEqual(["all", "ba", "bi", "bongu", "hutu", "saved"]);
    expect(GRAMMAR_TOPICS[1][1]).toBe("Câu chữ 把 / 被");
    expect(GRAMMAR_LEVELS).toEqual(["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]);
  });
});
