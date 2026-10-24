import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { HybridSyncProvider } from "../hybrid-sync-provider";

const { hybridStore, session } = vi.hoisted(() => ({
  hybridStore: {
    initHybridStore: vi.fn(() => vi.fn()),
    hybridOnAuthChange: vi.fn(),
  },
  session: { loggedIn: false, isPending: false },
}));

vi.mock("@/lib/store/hybrid-store", () => hybridStore);
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ ...session, name: "T", image: null, logout: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  session.loggedIn = false;
  session.isPending = false;
});

describe("HybridSyncProvider", () => {
  it("mount → initHybridStore 1 lần, unmount gọi cleanup", () => {
    const { unmount } = render(<HybridSyncProvider />);
    expect(hybridStore.initHybridStore).toHaveBeenCalledTimes(1);
    // isPending=false ngay từ đầu → effect đẩy trạng thái hiện tại (logout)
    expect(hybridStore.hybridOnAuthChange).toHaveBeenCalledWith(false);
    unmount();
    expect(hybridStore.initHybridStore.mock.results[0]!.value).toHaveBeenCalledTimes(1);
  });

  it("isPending → chưa đẩy trạng thái vào máy sync", () => {
    session.isPending = true;
    render(<HybridSyncProvider />);
    expect(hybridStore.hybridOnAuthChange).not.toHaveBeenCalled();
  });

  it("session đổi sang logged-in → hybridOnAuthChange(true)", () => {
    session.loggedIn = true;
    render(<HybridSyncProvider />);
    expect(hybridStore.hybridOnAuthChange).toHaveBeenCalledWith(true);
  });

  it("đã mount rồi mới login → hybridOnAuthChange(true) lần nữa", () => {
    const { rerender } = render(<HybridSyncProvider />);
    expect(hybridStore.hybridOnAuthChange).toHaveBeenCalledTimes(1);
    session.loggedIn = true;
    rerender(<HybridSyncProvider />);
    expect(hybridStore.hybridOnAuthChange).toHaveBeenCalledTimes(2);
    expect(hybridStore.hybridOnAuthChange).toHaveBeenLastCalledWith(true);
  });
});
