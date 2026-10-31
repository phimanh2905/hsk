import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ClientAuthGate from "@/components/auth/client-auth-gate";

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
const openLogin = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin, close: vi.fn() }),
}));
const mockUseSession = vi.mocked((await import("@/lib/auth-client")).authClient.useSession);

describe("ClientAuthGate", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    openLogin.mockClear();
  });

  it("đang kiểm tra session → skeleton, không render children", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("chưa login → không render children (redirect ở effect)", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("chưa login → mở LoginModal (parity server-gate)", async () => {
    const { waitFor } = await import("@testing-library/react");
    mockUseSession.mockReturnValue({ data: null, isPending: false } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    await waitFor(() => expect(openLogin).toHaveBeenCalled());
  });

  it("đã login → render children", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
