/* Unit test check-audio-size (W3 T10): fixture tmp dirs mô phỏng public/audio. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditAudioDir, FAIL_MB, WARN_MB } from "../src/check-audio-size";

let dir: string;

function writeBytes(rel: string, bytes: number) {
  const p = path.join(dir, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, Buffer.alloc(bytes));
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "check-audio-size-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("auditAudioDir", () => {
  it("dir không tồn tại → total 0, status ok", () => {
    const r = auditAudioDir(path.join(dir, "missing"));
    expect(r.totalBytes).toBe(0);
    expect(r.status).toBe("ok");
    expect(r.books).toEqual([]);
  });

  it("đếm đúng tổng per book và toàn cục", () => {
    writeBytes("hsk1/lesson-1-1.mp3", 1000);
    writeBytes("hsk1/lesson-1-2.mp3", 500);
    writeBytes("hsk2/lesson-1-1.mp3", 250);
    const r = auditAudioDir(dir);
    expect(r.totalBytes).toBe(1750);
    expect(r.books).toEqual([
      { book: "hsk1", bytes: 1500 },
      { book: "hsk2", bytes: 250 },
    ]);
    expect(r.status).toBe("ok");
  });

  it("vượt WARN → status warn, vượt FAIL → status fail (ngưỡng tính theo MB nhị phân)", () => {
    writeBytes("hsk1/lesson-1-1.mp3", 40 * 1024 * 1024 + 1);
    expect(auditAudioDir(dir, WARN_MB, FAIL_MB).status).toBe("warn");
    writeBytes("hsk1/lesson-1-2.mp3", 40 * 1024 * 1024);
    expect(auditAudioDir(dir, WARN_MB, FAIL_MB).status).toBe("fail");
  });

  it("ngưỡng mặc định WARN 40MB / FAIL 80MB", () => {
    expect(WARN_MB).toBe(40);
    expect(FAIL_MB).toBe(80);
  });

  it("bỏ qua file không phải mp3 ở các thư mục con", () => {
    writeBytes("hsk1/notes.txt", 10);
    writeBytes("hsk1/lesson-1-1.mp3", 100);
    const r = auditAudioDir(dir);
    expect(r.totalBytes).toBe(100);
  });
});
