import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LoginGate } from "../login-gate";

// stub useLoginModal của plan learning-core (file thật cần DOM shell đầy đủ)
vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

// UPG-2: gate đọc session thật qua useSession, không đọc localStorage mock nữa.
const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ ...session, name: "T", image: null, isPending: false, logout: vi.fn() }),
}));

// globals không bật trong vitest config → RTL auto-cleanup không chạy, phải cleanup thủ công
afterEach(cleanup);

describe("LoginGate (F6)", () => {
  it("chưa login → icon khóa + đúng sub text + nút Đăng nhập", () => {
    session.loggedIn = false;
    render(<LoginGate pageSub="Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."><div>nội dung</div></LoginGate>);
    expect(document.querySelector(".lucide-lock")).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập để xem")).toBeInTheDocument();
    expect(screen.getByText("Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.")).toBeInTheDocument();
    expect(screen.queryByText("nội dung")).not.toBeInTheDocument();
  });
  it("đã có session → render children", () => {
    session.loggedIn = true;
    render(<LoginGate pageSub="x"><div>nội dung</div></LoginGate>);
    expect(screen.getByText("nội dung")).toBeInTheDocument();
    session.loggedIn = false;
  });
});