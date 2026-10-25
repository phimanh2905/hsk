import { beforeAll, describe, expect, it } from "vitest";
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
    expect(entries[0]).toEqual({ id: "L1-0001", hanzi: "爱", pinyin: "ài", level: 1 });
    expect(entries[1]).toEqual({ id: "L1-0002", hanzi: "爱好", pinyin: "àihào", level: 1 });
    expect(entries[2]).toEqual({ id: "L2-0001", hanzi: "爸爸", pinyin: "bàba", level: 2 });
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

  it("cumulative ≤ maxLevel, chỉ dedupe row trùng hoàn toàn (cả level), giữ thứ tự", () => {
    expect(wordsForLevels(entries, 1)).toEqual([
      { hanzi: "爱", pinyin: "ài", level: 1 },
      { hanzi: "好", pinyin: "hǎo", level: 1 }
    ]);
    expect(wordsForLevels(entries, 2)).toEqual([
      { hanzi: "爱", pinyin: "ài", level: 1 },
      { hanzi: "爸爸", pinyin: "bàba", level: 2 },
      { hanzi: "爱", pinyin: "ài", level: 2 },
      { hanzi: "好", pinyin: "hǎo", level: 1 }
    ]);
    expect(wordsForLevels(entries, 5)).toHaveLength(5);
  });

  it("row trùng hoàn toàn (hanzi+pinyin+level) bị loại, giữ lần đầu", () => {
    const dups: HskEntry[] = [
      { hanzi: "好", pinyin: "hǎo", level: 1 },
      { hanzi: "好", pinyin: "hǎo", level: 1 }
    ];
    expect(wordsForLevels(dups, 5)).toEqual([{ hanzi: "好", pinyin: "hǎo", level: 1 }]);
  });
});

/* Ruling controller: dedupe chỉ loại row trùng HOÀN TOÀN (hanzi+pinyin).
   Integration assert QUA wordsForLevels — phải khớp đúng chuẩn HSK 3.0
   500/1272/2245/3245/4316 (cùng hanzi khác pinyin = từ khác, giữ nguyên). */
const VENDOR_CSV = path.join(__dirname, "..", "vendor", "hsk30.csv");

describe.skipIf(!existsSync(VENDOR_CSV))("HSK 3.0 dataset chuẩn (integration)", () => {
  /* Vitest vẫn chạy body describe lúc collect (kể cả suite bị skip) — đọc file
     phải lazy trong it/beforeAll, nếu không CI thiếu vendor/hsk30.csv sẽ ENOENT
     dù skipIf đã guard (bug CI run 40149549440). */
  let entries: HskEntry[] = [];
  beforeAll(() => {
    entries = parseHsk30Csv(readFileSync(VENDOR_CSV, "utf-8"));
  });

  it.each([1, 2, 3, 4, 5])("wordsForLevels cumulative level %i khớp chuẩn HSK 3.0", (n) => {
    expect(wordsForLevels(entries, n)).toHaveLength(EXPECTED_CUMULATIVE[n as keyof typeof EXPECTED_CUMULATIVE]);
  });

  it("dedupe không mất từ (row identity duy nhất, kể cả trùng hanzi+pinyin cùng level)", () => {
    const deduped = wordsForLevels(entries, 5);
    const ids = deduped.map((w) => w.id ?? `${w.hanzi}\u0000${w.pinyin}\u0000${w.level}`);
    expect(new Set(ids).size).toBe(deduped.length);
  });
});

it("EXPECTED_CUMULATIVE là hằng chuẩn", () => {
  expect(EXPECTED_CUMULATIVE).toEqual({ 1: 500, 2: 1272, 3: 2245, 4: 3245, 5: 4316 });
});
