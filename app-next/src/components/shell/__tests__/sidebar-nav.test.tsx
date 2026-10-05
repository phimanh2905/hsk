import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SidebarNav from "../sidebar-nav";

const openLogin = vi.fn();
vi.mock("../login-modal", () => ({ useLoginModal: () => ({ openLogin }) }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ loggedIn: false, name: "", image: null, isPending: false, logout: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/review" }));

beforeEach(() => {
  localStorage.clear();
  openLogin.mockClear();
});

describe("SidebarNav (app-shell.html)", () => {
  it("render 3 nhóm với đúng item và route", () => {
    render(<SidebarNav />);
    for (const h of ["HỌC TẬP CỐT LÕI", "KỸ NĂNG & LUYỆN TẬP", "CÁ NHÂN & CÔNG CỤ"]) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
    const routes: Array<[RegExp, string]> = [
      [/Trang chủ/, "/"],
      [/Lộ trình HSK/, "/roadmap"],
      [/Ôn tập SRS/, "/review"],
      [/Hanzi Studio/, "/hanzi"],
      [/Luyện nói & Đọc/, "/shadowing"],
      [/Bảng âm Pinyin/, "/pinyin"],
      [/Sổ tay từ vựng/, "/my-vocab"],
      [/Thống kê tiến độ/, "/progress"],
      [/Tạo tập viết in/, "/create-file"],
    ];
    for (const [name, href] of routes) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("active item theo pathname có aria-current=page", () => {
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: /Ôn tập SRS/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Trang chủ/ })).not.toHaveAttribute("aria-current");
  });

  it("badge SRS hiện số từ đến hạn, không hiện khi 0", async () => {
    localStorage.setItem(
      "nhai.srs.items",
      JSON.stringify({ k: { key: "k", status: "new", dueAt: Date.now() - 100, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 } })
    );
    render(<SidebarNav />);
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("event nhai:open-nav mở drawer; Escape đóng", async () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav.className).toContain("-translate-x-full");
    window.dispatchEvent(new CustomEvent("nhai:open-nav"));
    await vi.waitFor(() => expect(nav.className).not.toContain("-translate-x-full"));
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(nav.className).toContain("-translate-x-full"));
  });

  it("click link điều hướng thì drawer đóng lại (Review Focus #1)", async () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    window.dispatchEvent(new CustomEvent("nhai:open-nav"));
    await vi.waitFor(() => expect(nav.className).not.toContain("-translate-x-full"));
    await userEvent.click(screen.getByRole("link", { name: /Lộ trình HSK/ }));
    await vi.waitFor(() => expect(nav.className).toContain("-translate-x-full"));
  });

  it("scrim đóng drawer (đường đóng #2)", async () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    window.dispatchEvent(new CustomEvent("nhai:open-nav"));
    await vi.waitFor(() => expect(nav.className).not.toContain("-translate-x-full"));
    await userEvent.click(screen.getByRole("button", { name: "Đóng menu" }));
    await vi.waitFor(() => expect(nav.className).toContain("-translate-x-full"));
  });

  it("badge SRS không hiện khi không có từ đến hạn (srsDue = 0)", () => {
    render(<SidebarNav />);
    // Badge render srsDue ON !! 0, localStorage sạch -> không span nào chứa "0"
    const badge = screen.queryByText("0");
    expect(badge).not.toBeInTheDocument();
    // Và link Ôn tập SRS không chứa badge container (ml-auto)
    const reviewLink = screen.getByRole("link", { name: /Ôn tập SRS/ });
    expect(reviewLink.querySelector("span.ml-auto")).not.toBeInTheDocument();
  });

  it("user-card: logged out hiện nút Đăng nhập gọi openLogin", async () => {
    render(<SidebarNav />);
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(openLogin).toHaveBeenCalledTimes(1);
  });
});
