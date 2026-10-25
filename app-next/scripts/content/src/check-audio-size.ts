/* check-audio-size (W3 T10): đếm dung lượng public/audio theo book (hskN).

Đệ quy `public/audio/**`, cộng byte từng file .mp3, in tổng MB per book + tổng.
Ngưỡng ngân sách (Wave 3: 130 bài × ~50s × 32kbps ≈ 25–35MB):
- WARN nếu tổng > WARN_MB (40MB) — giảm bitrate về 24k và render lại `--force`.
- FAIL (exit 1) nếu tổng > FAIL_MB (80MB).

KHÔNG chạy trong build/CI — tool thủ công.

Usage: pnpm dlx tsx scripts/content/src/check-audio-size.mts [--audio-dir <path>]
Mặc định: <app>/public/audio. Export auditAudioDir để unit test (fixture tmp dirs). */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WARN_MB = 40;
export const FAIL_MB = 80;
const MB = 1024 * 1024;

export type BookSize = { book: string; bytes: number };
export type AudioAudit = {
  totalBytes: number;
  books: BookSize[];
  status: "ok" | "warn" | "fail";
};

/** Đệ quy đếm byte các file .mp3 dưới audioDir, nhóm theo thư mục con cấp 1 (book). */
export function auditAudioDir(audioDir: string, warnMb = WARN_MB, failMb = FAIL_MB): AudioAudit {
  const books = new Map<string, number>();
  let totalBytes = 0;

  function walk(dir: string, book: string | null) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // dir không tồn tại / không đọc được
    }
    for (const name of entries.sort()) {
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        walk(p, book ?? name);
      } else if (name.toLowerCase().endsWith(".mp3") && book !== null) {
        books.set(book, (books.get(book) ?? 0) + st.size);
        totalBytes += st.size;
      }
    }
  }
  walk(audioDir, null);

  const status: AudioAudit["status"] =
    totalBytes > failMb * MB ? "fail" : totalBytes > warnMb * MB ? "warn" : "ok";
  return { totalBytes, books: [...books].map(([book, bytes]) => ({ book, bytes })), status };
}

function main() {
  const i = process.argv.indexOf("--audio-dir");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const audioDir =
    i >= 0 && i + 1 < process.argv.length
      ? process.argv[i + 1]
      : path.resolve(scriptDir, "../../../public/audio");

  const { totalBytes, books, status } = auditAudioDir(audioDir);

  console.log(`Ngân sách public/audio: ${audioDir}`);
  for (const { book, bytes } of books) {
    console.log(`  ${book}: ${(bytes / MB).toFixed(2)} MB`);
  }
  console.log(`  TỔNG: ${(totalBytes / MB).toFixed(2)} MB (${books.length} book)`);

  if (status === "fail") {
    console.error(
      `FAIL: tổng ${(totalBytes / MB).toFixed(2)} MB vượt ngân sách ${FAIL_MB} MB — bắt buộc giảm bitrate về 24k rồi render lại --force.`
    );
    process.exit(1);
  }
  if (status === "warn") {
    console.warn(
      `WARN: tổng ${(totalBytes / MB).toFixed(2)} MB vượt ${WARN_MB} MB — nên giảm bitrate về 24k và render lại --force.`
    );
  } else {
    console.log("OK: trong ngân sách.");
  }
}

// Chỉ chạy main khi execute trực tiếp (không chạy khi import để unit test).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
