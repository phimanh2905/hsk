import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadState, saveState, type ChunkState } from "../src/batch-state";
import { readEnvFile } from "../src/read-env";

function makeTmp(): string {
  return mkdtempSync(path.join(tmpdir(), "batch-state-test-"));
}

const WORD_A = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "xin chào",
  pos: "Đại từ", hskLevel: 1,
  example: { zh: "你好！", pinyin: [{ c: "你", py: "nǐ" }, { c: "好", py: "hǎo" }, { c: "！", py: "！" }], vi: "Xin chào!" }
};

describe("batch-state", () => {
  let dir: string;
  beforeEach(() => { dir = makeTmp(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("save -> load vòng tròn: chunk đã done xuất hiện trong key set", () => {
    const state: ChunkState = { level: 1, chunkIndex: 3, status: "done", words: [WORD_A as never] };
    saveState(dir, state);
    const done = loadState(dir);
    expect(done.has("1:3")).toBe(true);
    expect(done.size).toBe(1);
  });

  it("load nhiều chunk, key đúng format level:chunkIndex", () => {
    saveState(dir, { level: 2, chunkIndex: 0, status: "done", words: [] });
    saveState(dir, { level: 2, chunkIndex: 15, status: "done", words: [] });
    const done = loadState(dir);
    expect(done.has("2:0")).toBe(true);
    expect(done.has("2:15")).toBe(true);
    expect(done.size).toBe(2);
  });

  it("dir rỗng/không tồn tại -> set rỗng", () => {
    expect(loadState(dir).size).toBe(0);
    expect(loadState(path.join(dir, "missing")).size).toBe(0);
  });

  it("atomic: không để lại file tạm trong state dir", () => {
    saveState(dir, { level: 1, chunkIndex: 0, status: "done", words: [] });
    const files = readdirSync(dir);
    expect(files).toEqual(["1-0.json"]); // chỉ file cuối, không rò *.tmp
  });

  it("save ghi JSON đọc lại được đúng words", () => {
    const state: ChunkState = { level: 5, chunkIndex: 1, status: "done", words: [WORD_A as never] };
    saveState(dir, state);
    const raw = JSON.parse(readFileSync(path.join(dir, "5-1.json"), "utf8"));
    expect(raw.status).toBe("done");
    expect(raw.words[0].hanzi).toBe("你好");
  });
});

describe("readEnvFile", () => {
  let dir: string;
  beforeEach(() => { dir = makeTmp(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("parse KEY=VALUE, bỏ comment và dòng trống, trim quote", () => {
    const file = path.join(dir, ".env.local");
    writeFileSync(file, [
      "# comment",
      "",
      "FOO=bar",
      "QUOTED=\"hello world\"",
      "SINGLE='single'",
      "  SPACED = spaced value  ",
      "EMPTY="
    ].join("\n"));
    const env = readEnvFile(file);
    expect(env.FOO).toBe("bar");
    expect(env.QUOTED).toBe("hello world");
    expect(env.SINGLE).toBe("single");
    expect(env.SPACED).toBe("spaced value");
    expect(env.EMPTY).toBe("");
  });

  it("KHÔNG override biến đã có trong process.env", () => {
    const file = path.join(dir, ".env.local");
    writeFileSync(file, "EXISTING_VAR=from_file\nNEW_VAR=from_file\n");
    vi.stubEnv("EXISTING_VAR", "from_process");
    try {
      const env = readEnvFile(file);
      expect(env.EXISTING_VAR).toBeUndefined(); // đã có trong process.env -> loại khỏi kết quả
      expect(env.NEW_VAR).toBe("from_file");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("file không tồn tại -> trả object rỗng (không throw)", () => {
    expect(readEnvFile(path.join(dir, "missing.env"))).toEqual({});
  });

  it("không ghi đè file .env.local thật", () => {
    // ghi rõ ràng file test, kiểm tra nội dung giữ nguyên sau khi đọc
    const file = path.join(dir, ".env.local");
    writeFileSync(file, "A=1");
    readEnvFile(file);
    expect(readFileSync(file, "utf8")).toBe("A=1");
    expect(existsSync(file)).toBe(true);
  });
});
