import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoginProvider, LoginModal, useLoginModal } from "../login-modal";

function Trigger() {
  const { openLogin } = useLoginModal();
  return <button onClick={openLogin}>mở</button>;
}

beforeEach(() => localStorage.clear());

describe("LoginModal (mock)", () => {
  it("openLogin mở modal; bấm Google mock set nhai.mockLogin=1 và đóng", () => {
    render(<LoginProvider><Trigger /><LoginModal /></LoginProvider>);
    act(() => screen.getByText("mở").click());
    expect(screen.getByText(/Đăng nhập/)).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: /Google/ }).click());
    expect(localStorage.getItem("nhai.mockLogin")).toBe("1");
  });
});
