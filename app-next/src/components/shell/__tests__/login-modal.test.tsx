import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { LoginProvider, LoginModal, useLoginModal } from "../login-modal";

const { signInSocial } = vi.hoisted(() => ({ signInSocial: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { social: signInSocial } },
}));

function Trigger() {
  const { openLogin } = useLoginModal();
  return <button onClick={openLogin}>mở</button>;
}

describe("LoginModal (UPG-2 — better-auth)", () => {
  it("openLogin mở modal; bấm Google gọi signIn.social provider google", async () => {
    signInSocial.mockResolvedValue({ error: null });
    render(<LoginProvider><Trigger /><LoginModal /></LoginProvider>);
    act(() => screen.getByText("mở").click());
    expect(screen.getByRole("dialog", { name: "Đăng nhập" })).toBeInTheDocument();
    await act(async () => screen.getByRole("button", { name: /Google/ }).click());
    expect(signInSocial).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
  });

  it("KHÔNG còn nút Apple / Email (spec 00 §1 bỏ Apple vì site gốc bịa)", () => {
    render(<LoginProvider><Trigger /><LoginModal /></LoginProvider>);
    act(() => screen.getByText("mở").click());
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("✉️ Email")).not.toBeInTheDocument();
  });

  it("signIn.social trả error → hiện thông báo lỗi", async () => {
    signInSocial.mockResolvedValue({ error: { message: "Google từ chối" } });
    render(<LoginProvider><Trigger /><LoginModal /></LoginProvider>);
    act(() => screen.getByText("mở").click());
    await act(async () => screen.getByRole("button", { name: /Google/ }).click());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Google từ chối"));
  });
});