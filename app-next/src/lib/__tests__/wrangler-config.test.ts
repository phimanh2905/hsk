import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Guard: CI deploy theo wrangler.jsonc, mỗi lần quên block observability là prod
   mất logs (CI reset về disabled). Test này chặn config bị xoá. */
function parseJsonc(raw: string): Record<string, unknown> {
  const noComments = raw.replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(noComments.replace(/,(\s*[}\]])/g, "$1"));
}

describe("wrangler.jsonc (prod)", () => {
  const cfg = parseJsonc(readFileSync(resolve(__dirname, "../../../wrangler.jsonc"), "utf8"));

  it("bật observability (không bị CI reset tắt logs)", () => {
    expect((cfg.observability as { enabled?: boolean } | undefined)?.enabled).toBe(true);
  });

  it("giữ D1 binding DB tên hsk", () => {
    const dbs = cfg.d1_databases as Array<{ binding: string; database_name: string }>;
    expect(dbs.some((d) => d.binding === "DB" && d.database_name === "hsk")).toBe(true);
  });
});
