// src/lib/notebook/__tests__/capture.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readLocalEntries } from "@/lib/notebook/entries";
import { resetCaptureDedupe, captureWrong } from "@/lib/notebook/capture";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession } }));
const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve({ item: {} }) });
vi.stubGlobal("fetch", fetchMock);

const input = { q: "Từ „时间‟ đọc thế nào?", wrong: { zh: "shíjiān" }, right: { zh: "shíjiān", py: "shíjiān" }, cause: "c" };

beforeEach(() => { localStorage.clear(); fetchMock.mockClear(); getSession.mockReset(); resetCaptureDedupe(); });

describe("captureWrong (spec §3.4)", () => {
  it("ghi entry kind=wrong source=auto vào local + dispatch bye:progress", () => {
    const listener = vi.fn();
    window.addEventListener("bye:progress", listener);
    captureWrong(input);
    window.removeEventListener("bye:progress", listener);
    const list = readLocalEntries();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "wrong", source: "auto", saved: false, tagTone: "red" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("dedupe 24h: cùng q+right.zh → chỉ 1 entry; khác q → 2", () => {
    captureWrong(input);
    captureWrong(input);
    expect(readLocalEntries()).toHaveLength(1);
    captureWrong({ ...input, q: "Câu khác" });
    expect(readLocalEntries()).toHaveLength(2);
  });
  it("đã đăng nhập → POST fire-and-forget; guest → không fetch", async () => {
    captureWrong(input);
    expect(fetchMock).not.toHaveBeenCalled(); // getSession trả null mặc định
    getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    captureWrong({ ...input, q: "Câu đăng nhập" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/notebook/entries", expect.objectContaining({ method: "POST" }));
  });
});
