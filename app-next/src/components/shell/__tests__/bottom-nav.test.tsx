import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BottomNav from "../bottom-nav";

/* useHomeSummary thật đọc progressStore (localStorage) và mounted=false ở render đầu
   → assert badge sẽ phụ thuộc timing effect. Mock để test đúng contract của BottomNav:
   badge hiện iff (mounted && srsDue > 0). Đường progressStore → srsDue đã có test ở sidebar-nav. */
const hs = vi.hoisted(() => ({ srsDue: 0, mounted: true }));
vi.mock("@/lib/home-summary", () => ({ useHomeSummary: () => hs }));

const openNav = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  openNav.mockClear();
  hs.srsDue = 0;
  hs.mounted = true;
  window.addEventListener("nhai:open-nav", openNav);
});
afterEach(() => window.removeEventListener("nhai:open-nav", openNav));

describe("BottomNav (app-shell.html)", () => {
  it("5 mục: Home, Roadmap, Review, Hanzi, More", () => {
    render(<BottomNav />);
    for (const l of ["Home", "Roadmap", "Review", "Hanzi"]) {
      expect(screen.getByRole("link", { name: new RegExp(l) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("route đúng + active theo pathname", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Roadmap/ })).toHaveAttribute("href", "/roadmap");
    expect(screen.getByRole("link", { name: /Review/ })).toHaveAttribute("href", "/review");
    expect(screen.getByRole("link", { name: /Hanzi/ })).toHaveAttribute("href", "/hanzi");
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Roadmap/ })).not.toHaveAttribute("aria-current");
  });

  it("badge Review hiện số từ đến hạn", () => {
    hs.srsDue = 7;
    render(<BottomNav />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review/ })).toHaveTextContent("7");
  });

  it("badge ẩn khi srsDue = 0", () => {
    hs.srsDue = 0;
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Review" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("badge ẩn khi chưa mounted (guard hydration)", () => {
    hs.mounted = false;
    hs.srsDue = 7;
    render(<BottomNav />);
    expect(screen.queryByText("7")).not.toBeInTheDocument();
  });

  it("More dispatch nhai:open-nav (mở drawer)", async () => {
    render(<BottomNav />);
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    expect(openNav).toHaveBeenCalledTimes(1);
  });

  it("ẩn từ lg trở lên (class lg:hidden)", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav.className).toContain("lg:hidden");
  });
});