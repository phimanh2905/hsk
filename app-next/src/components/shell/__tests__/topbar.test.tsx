import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topbar from "../topbar";
import { ThemeProvider } from "../theme-provider";

// SearchField dùng useRouter — cần mock ngoài AppRouterContext
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ loggedIn: false, name: "", image: null, isPending: false, logout: vi.fn() }),
}));
const openLogin = vi.fn();
vi.mock("../login-modal", () => ({ useLoginModal: () => ({ openLogin }) }));

beforeEach(() => {
  localStorage.clear();
  openLogin.mockClear();
  document.documentElement.classList.remove("dark");
});

function renderTopbar() {
  return render(<ThemeProvider><Topbar /></ThemeProvider>);
}

describe("Topbar mới (spec 2026-10-04)", () => {
  it("brand tile + tên Nhai", () => {
    renderTopbar();
    expect(screen.getByText("奈", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Nhai")).toBeInTheDocument();
  });
  it("streak pill mini hiện số từ nhai.streak", async () => {
    localStorage.setItem("nhai.streak", "7");
    renderTopbar();
    expect(await screen.findByText("7")).toBeInTheDocument();
  });
  it("nút theme toggle class dark trên html", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Chuyển chế độ sáng tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
  it("HSK switcher chọn mục tiêu lưu nhai.goal", async () => {
    renderTopbar();
    const select = screen.getByLabelText("Cấp độ HSK") as HTMLSelectElement;
    await userEvent.selectOptions(select, "HSK 3");
    expect(localStorage.getItem("nhai.goal")).toBe("HSK 3");
  });
  it("avatar khi logged out có aria-label Đăng nhập, click gọi openLogin", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(openLogin).toHaveBeenCalledTimes(1);
  });
});
