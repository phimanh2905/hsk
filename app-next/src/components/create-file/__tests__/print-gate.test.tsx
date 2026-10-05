import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrintButton from "../print-button";
import FreehskGate from "../freehsk-gate";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

// UPG-2: gate in giờ dựa session thật + mã FREEHSK, không còn localStorage mock.
const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ ...session, name: "T", image: null, isPending: false, logout: vi.fn() }),
}));

beforeEach(() => {
  localStorage.clear();
  session.loggedIn = false;
});

describe("PrintButton gate (G8)", () => {
  it("chưa login + chưa mã → 'Đăng nhập để in'; sau khi unlock (bye.fileCode=1) → 'In / Lưu PDF' gọi window.print", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const { rerender } = render(<PrintButton />);
    expect(screen.getByText("Đăng nhập để in")).toBeTruthy();
    localStorage.setItem("bye.fileCode", "1");
    rerender(<PrintButton key="unlocked2" />);
    await user.click(await screen.findByRole("button", { name: "In / Lưu PDF" }));
    expect(printSpy).toHaveBeenCalled();
  });

  it("đã có session → hiện thẳng nút in, không mở gate", async () => {
    session.loggedIn = true;
    render(<PrintButton />);
    expect(await screen.findByRole("button", { name: "In / Lưu PDF" })).toBeTruthy();
    expect(screen.queryByText("Đăng nhập để in")).toBeNull();
  });
});

describe("FreehskGate", () => {
  it("mã FREEHSK → unlock + lưu bye.fileCode; sai mã → toast đúng nội dung", async () => {
    const user = userEvent.setup();
    const onUnlocked = vi.fn();
    render(<FreehskGate onUnlocked={onUnlocked} />);
    await user.type(screen.getByTestId("code-input"), "WRONG");
    await user.click(screen.getByTestId("code-submit"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Mã không đúng. Mã nằm ở mô tả nhóm Facebook");
    expect(onUnlocked).not.toHaveBeenCalled();
    await user.clear(screen.getByTestId("code-input"));
    await user.type(screen.getByTestId("code-input"), "FREEHSK");
    await user.click(screen.getByTestId("code-submit"));
    expect(localStorage.getItem("bye.fileCode")).toBe("1");
    expect(onUnlocked).toHaveBeenCalled();
  });
});