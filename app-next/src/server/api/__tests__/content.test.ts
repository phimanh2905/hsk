import { describe, it, expect, vi, beforeEach } from "vitest";

const getVocab = vi.fn();
vi.mock("@/lib/content/vocab", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/vocab")>();
  return { ...actual, getVocab: (...a: unknown[]) => getVocab(...a) };
});

import { handleContentVocab } from "../content";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("handleContentVocab", () => {
  it("200 + Cache-Control khi dữ liệu đọc thành công", async () => {
    getVocab.mockResolvedValue([{ hsk: "HSK1" }]);
    const res = await handleContentVocab();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(CACHE);
    expect(await res.json()).toEqual([{ hsk: "HSK1" }]);
  });

  it("500 JSON khi getVocab throw", async () => {
    getVocab.mockRejectedValue(new Error("d1 down"));
    const res = await handleContentVocab();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Không đọc được dữ liệu từ vựng" });
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});
