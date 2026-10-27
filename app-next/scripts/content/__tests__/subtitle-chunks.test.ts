import { describe, expect, it } from "vitest";
import { chunkByJsonBytes, subtitleInsertStatements } from "../subtitle-chunks";

const esc = (s: string) => s.replace(/'/g, "''");

describe("chunkByJsonBytes", () => {
  it("mảng rỗng → 1 chunk rỗng", () => {
    expect(chunkByJsonBytes([], 100)).toEqual([[]]);
  });
  it("mọi chunk đều ≤ maxBytes (trừ phần tử đơn lẻ quá khổ)", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ zh: "字".repeat(10), i }));
    const chunks = chunkByJsonBytes(items, 400);
    for (const c of chunks) expect(JSON.stringify(c).length).toBeLessThanOrEqual(400);
    expect(chunks.flatMap((c) => c)).toEqual(items);
  });
  it("phần tử đơn lẻ > maxBytes vẫn giữ nguyên (không cắt giữa phần tử)", () => {
    const big = { zh: "x".repeat(500) };
    const chunks = chunkByJsonBytes([big, { zh: "y" }], 100);
    expect(chunks[0]).toEqual([big]);
    expect(chunks[1]).toEqual([{ zh: "y" }]);
  });
});

describe("subtitleInsertStatements", () => {
  it("sinh đúng số chunk + chỉ số chunk tăng dần từ 0", () => {
    const sentences = Array.from({ length: 80 }, (_, i) => ({ n: i + 1, zh: "语".repeat(20) }));
    const stmts = subtitleInsertStatements("vid1", sentences, esc, 1000);
    expect(stmts[0]).toContain("DELETE FROM content_shadowing_subtitles");
    expect(stmts.length).toBeGreaterThan(2);
    stmts.slice(1).forEach((s, i) => expect(s).toContain(`'vid1', ${i},`));
    expect(stmts.slice(1).every((s) => s.startsWith("INSERT OR REPLACE INTO content_shadowing_subtitles"))).toBe(true);
  });
  it("1 chunk nhỏ → DELETE + 1 INSERT có chunk 0", () => {
    const stmts = subtitleInsertStatements("vid2", [{ n: 1, zh: "你好" }], esc);
    expect(stmts).toHaveLength(2);
    expect(stmts[0]).toContain("DELETE FROM content_shadowing_subtitles WHERE video_id = 'vid2'");
    expect(stmts[1]).toContain("'vid2', 0,");
  });
  it("escape qua esc (dấu ' trong JSON thành '')", () => {
    const stmts = subtitleInsertStatements("vid3", [{ vi: "người's" }], esc);
    expect(stmts[1]).toContain("người''s");
  });
});
