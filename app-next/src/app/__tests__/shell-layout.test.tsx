import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SidebarNav from "@/components/shell/sidebar-nav";
import Topbar from "@/components/shell/topbar";
import BottomNav from "@/components/shell/bottom-nav";
import { ThemeProvider } from "@/components/shell/theme-provider";

// Sanity test đúng cấu trúc render của src/app/layout.tsx (Task 6):
// SidebarNav + wrapper (Topbar + main) + BottomNav — khẳng định cả 3 mount không throw.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/shell/login-modal", () => ({ useLoginModal: () => ({ openLogin: vi.fn() }) }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ loggedIn: false, name: "", image: null, isPending: false, logout: vi.fn() }),
}));

function Shell() {
  return (
    <>
      <SidebarNav />
      <div className="flex min-h-screen flex-col lg:ml-64">
        <Topbar />
        <main className="flex-1">Nội dung trang</main>
      </div>
      <BottomNav />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("shell layout (root layout composition)", () => {
  it("mount SidebarNav + Topbar + BottomNav cùng lúc mà không throw", () => {
    const { container } = render(
      <ThemeProvider>
        <Shell />
      </ThemeProvider>,
    );
    // Sidebar: 2 nav (sidebar desktop + drawer), Topbar: banner, BottomNav: nav di động.
    const navs = container.querySelectorAll("nav");
    expect(navs.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('nav[aria-label="Điều hướng di động"]')).not.toBeNull();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Nội dung trang")).toBeInTheDocument();
    expect(screen.getAllByText("Trang chủ").length).toBeGreaterThanOrEqual(1);
  });
});
