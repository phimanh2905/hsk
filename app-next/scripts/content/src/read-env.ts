/* Đọc .env.local cho content scripts: dòng KEY=VALUE, bỏ comment `#` và dòng trống,
   trim quote bao ngoài. Biến đã có trong process.env GIỮ NGUYÊN (không override). */
import { existsSync, readFileSync } from "node:fs";

function stripQuotes(v: string): string {
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

/* Trả về các biến trong file CHƯA có trong process.env. File không tồn tại -> {}. */
export function readEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(filePath)) return out;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = stripQuotes(trimmed.slice(eq + 1).trim());
    if (key in process.env) continue; // process.env ưu tiên
    out[key] = value;
  }
  return out;
}
