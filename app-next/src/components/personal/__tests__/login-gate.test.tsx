import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LoginGate } from "../login-gate";

// stub useLoginModal của plan learning-core (file thật cần DOM shell đầy đủ)
vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

// globals không bật trong vitest config → RTL auto-cleanup không chạy, phải cleanup thủ công
afterEach(cleanup);

beforeEach(() => localStorage.clear());

describe("LoginGate (F6 mock)", () => {
  it("chưa login → 🔒 + đúng sub text + nút Đăng nhập", () => {
    render(<LoginGate pageSub="Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."><div>nội dung</div></LoginGate>);
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập để xem")).toBeInTheDocument();
    expect(screen.getByText("Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.")).toBeInTheDocument();
    expect(screen.queryByText("nội dung")).not.toBeInTheDocument();
  });
  it("mockLogin=1 → render children", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    render(<LoginGate pageSub="x"><div>nội dung</div></LoginGate>);
    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });
  it("bấm Đăng nhập mở login modal; setMockLogin từ modal → gate hiện nội dung ngay (event nhai:progress)", () => {
    render(<LoginGate pageSub="x"><div>nội dung</div></LoginGate>);
    act(() => screen.getByText("Đăng nhập").click());
    act(() => {
      localStorage.setItem("nhai.mockLogin", "1");
      window.dispatchEvent(new CustomEvent("nhai:progress"));
    });
    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });
});
