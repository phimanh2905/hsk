import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeleteAccountPage from "../page";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

beforeEach(() => {
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
});

describe("delete-account page (mock)", () => {
  it("submit → toast kèm email, disable nút + input, đổi text nút", () => {
    render(<DeleteAccountPage />);
    const email = screen.getByLabelText("Email tài khoản");
    const btn = screen.getByRole("button", { name: "Yêu cầu xoá" });

    fireEvent.change(email, { target: { value: "me@example.com" } });
    fireEvent.click(btn);

    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe(
      "Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email me@example.com."
    );
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Đã gửi yêu cầu" })).toBeDisabled();
    expect((screen.getByLabelText("Email tài khoản") as HTMLInputElement).disabled).toBe(true);
  });
});
