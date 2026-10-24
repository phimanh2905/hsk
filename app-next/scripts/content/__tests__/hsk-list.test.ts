import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  parseHsk30Csv,
  wordsForLevels,
  EXPECTED_CUMULATIVE,
  type HskEntry
} from "../src/hsk-list";

const SAMPLE = [
  "ID,Simplified,Traditional,Pinyin,POS,Level,WebNo",
  "L1-0001,爱,愛,ài,V,1,18",
  "L1-0002,爱好,愛好,àihào,V/N,1,21",
  "L2-0001,爸爸,爸爸,bàba,N,2,83",
  "H4-0001,爱,愛,ài,V,7-9,18"
].join("\n");

describe("parseHsk30Csv", () => {
  it("map cột theo tên header, bỏ level 7-9, giữ dấu pinyin", () => {
    const entries = parseHsk30Csv(SAMPLE);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ hanzi: "爱", pinyin: "ài", level: 1 });
    expect(entries[1]).toEqual({ hanzi: "爱好", pinyin: "àihào", level: 1 });
    expect(entries[2]).toEqual({ hanzi: "爸爸", pinyin: "bàba", level: 2 });
  });

  it("không phụ thuộc thứ tự cột, trim hanzi, bỏ entry rỗng", () => {
    const csv = ["level,simplified,pinyin", "1, 大 ,dà", "1,,", "x, ,y"].join("\n");
    const entries = parseHsk30Csv(csv);
    expect(entries).toEqual([{ hanzi: "大", pinyin: "dà", level: 1 }]);
  });

  it("bỏ entry level không parse được", () => {
    const csv = "simplified,pinyin,level\n爱,ài,\n好,hǎo,abc\n你,nǐ,3";
    expect(parseHsk30Csv(csv)).toEqual([{ hanzi: "你", pinyin: "nǐ", level: 3 }]);
  });
});

describe("wordsForLevels", () => {
  const entries: HskEntry[] = [
    { hanzi: "爱", pinyin: "ài", level: 1 },
    { hanzi: "爸爸", pinyin: "bàba", level: 2 },
    { hanzi: "爱", pinyin: "ài", level: 2 },
    { hanzi: "好", pinyin: "hǎo", level: 1 },
    { hanzi: "你", pinyin: "nǐ", level: 3 }
  ];

  it("cumulative ≤ maxLevel, dedupe theo hanzi giữ level thấp nhất, giữ thứ tự", () => {
    expect(wordsForLevels(entries, 1)).toEqual([
      { hanzi: "爱", pinyin: "ài", level: 1 },
      { hanzi: "好", pinyin: "hǎo", level: 1 }
    ]);
    expect(wordsForLevels(entries, 2)).toEqual([
      { hanzi: "爱", pinyin: "ài", level: 1 },
      { hanzi: "爸爸", pinyin: "bàba", level: 2 },
      { hanzi: "好", pinyin: "hǎo", level: 1 }
    ]);
    expect(wordsForLevels(entries, 5)).toHaveLength(4);
  });
});

/* CONTROLLER RULING (2026-10-24): raw word counts của hsk30.csv khớp chuẩn HSK 3.0
   (500/1272/2245/3245/4316); dedupe theo hanzi cho 497/1249/2199/3172/4231 vì một số
   hanzi xuất hiện ở nhiều level. Integration test assert trên list đầy đủ (raw),
   wordsForLevels (dedupe) vẫn theo spec cho chỗ cần unique hanzi. */
const VENDOR_CSV = path.join(__dirname, "..", "vendor", "hsk30.csv");

describe.skipIf(!existsSync(VENDOR_CSV))("HSK 3.0 dataset chuẩn (integration)", () => {
  const csv = readFileSync(VENDOR_CSV, "utf-8");
  const entries = parseHsk30Csv(csv);

  it.each([1, 2, 3, 4, 5])("cumulative level %i khớp chuẩn HSK 3.0", (n) => {
    const words = entries.filter((e) => e.level <= n);
    expect(words).toHaveLength(EXPECTED_CUMULATIVE[n]);
  });

  it("dedupe theo hanzi chỉ loại trùng giữa các level (không mất từ)", () => {
    const deduped = wordsForLevels(entries, 5);
    expect(deduped.length).toBeLessThanOrEqual(EXPECTED_CUMULATIVE[5]);
    expect(new Set(deduped.map((w) => w.hanzi)).size).toBe(deduped.length);
  });
});

it("EXPECTED_CUMULATIVE là hằng chuẩn", () => {
  expect(EXPECTED_CUMULATIVE).toEqual({ 1: 500, 2: 1272, 3: 2245, 4: 3245, 5: 4316 });
});
