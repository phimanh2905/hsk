import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("loadReadings", () => {
  it("fetch đúng endpoint và cache promise (1 fetch)", async () => {
    const docs = [{ id: "a" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(docs), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadReadings, __resetReadingsCache } = await import("@/lib/content/readings-client");
    __resetReadingsCache();
    await loadReadings();
    await loadReadings();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/content/readings");
  });
});
