import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrintButton from "../print-button";
import FreehskGate from "../freehsk-gate";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));
beforeEach(() => { localStorage.clear(); });

describe("PrintButton gate (G8 — mock đúng clone)", () => {
  it("chưa login + chưa mã → '🔒 Đăng nhập để in'; sau khi unlock (nhai.fileCode=1) → '🖨 In / Lưu PDF' gọi window.print", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const { rerender } = render(<PrintButton />);
    expect(screen.getByText("🔒 Đăng nhập để in")).toBeTruthy();
    rerender(<PrintButton key="unlocked" />);
    localStorage.setItem("nhai.fileCode", "1");
    rerender(<PrintButton key="unlocked2" />);
    await user.click(screen.getByText("🖨 In / Lưu PDF"));
    expect(printSpy).toHaveBeenCalled();
  });
});

describe("FreehskGate", () => {
  it("mã FREEHSK → unlock + lưu nhai.fileCode; sai mã → toast đúng nội dung", async () => {
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
    expect(localStorage.getItem("nhai.fileCode")).toBe("1");
    expect(onUnlocked).toHaveBeenCalled();
  });
});
