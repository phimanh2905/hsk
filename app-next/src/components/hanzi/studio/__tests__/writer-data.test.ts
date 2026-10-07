import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadWriterCharData, clearWriterDataCache } from "../writer-data";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  clearWriterDataCache();
  fetchMock.mockReset();
});

describe("loadWriterCharData", () => {
  it("fetch manifest 1 lần rồi cache chunk", async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith("manifest.json")
          ? { version: 1, chars: { 口: "c0", 汉: "c1" } }
          : url.endsWith("c0.json")
            ? { 口: { strokes: ["M1"], medians: [[[1, 2]]] } }
            : { 汉: { strokes: ["M2"], medians: [[[3, 4]]] } },
    }));
    expect(await loadWriterCharData("口")).toEqual({ strokes: ["M1"], medians: [[[1, 2]]] });
    expect(await loadWriterCharData("口")).toEqual({ strokes: ["M1"], medians: [[[1, 2]]] });
    expect(fetchMock).toHaveBeenCalledTimes(2); // manifest + c0, lần 2 hết fetch
  });

  it("chữ không có trong manifest → null, không fetch chunk", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 1, chars: {} }) });
    expect(await loadWriterCharData("龤")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("manifest fetch fail → null không throw", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await loadWriterCharData("口")).toBeNull();
  });
});
