import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@/lib/use-session", () => ({ useSession: () => useSession() }));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";

beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); });

describe("guest nhánh", () => {
  it("recordPractice ghi localStorage", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    const { result } = renderHook(() => useShadowingProgress());
    act(() => result.current.recordPractice("v1", { score: 80, secondsDelta: 10 }));
    expect(result.current.metrics.practiced).toBe(1);
    const stored = JSON.parse(localStorage.getItem("bye.shadow.progress")!);
    expect(stored.v1.score).toBe(80);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("user đăng nhập", () => {
  it("GET khi mount + PUT khi record", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ videoId: "v1" }) });
    });
    const { result } = renderHook(() => useShadowingProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.recordPractice("v1", { score: 80 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain("/api/v1/shadowing/progress/v1");
    expect(init.method).toBe("PUT");
  });
  it("PUT lỗi → giữ local + không ném", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((_, init) =>
      init
        ? Promise.reject(new Error("network"))
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useShadowingProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(() => act(() => result.current.recordPractice("v1", { score: 80 }))).not.toThrow();
    expect(result.current.progressMap.v1.score).toBe(80); // optimistic local vẫn cập nhật
  });
  it("merge guest → server đúng 1 lần rồi clear key guest", async () => {
    localStorage.setItem("bye.shadow.progress", JSON.stringify({
      v1: { status: "done", score: 88, seconds: 60, linesDone: 9, updatedAt: "2026-10-05T00:00:00Z" },
    }));
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) });
    renderHook(() => useShadowingProgress());
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, i]) => (i as RequestInit).method === "PUT")).toHaveLength(1));
    expect(localStorage.getItem("bye.shadow.progress")).toBe(null);
  });
});
