import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import Topbar from "../topbar";
import { ThemeProvider } from "../theme-provider";

// pathname đổi được giữa các test → chứng minh breadcrumb theo route, không hardcode.
const nav = vi.hoisted(() => ({ pathname: "/roadmap" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: vi.fn() }) }));

const openNav = vi.fn();
window.addEventListener("bye:open-nav", openNav);

beforeEach(() => {
  localStorage.clear();
  nav.pathname = "/roadmap";
  openNav.mockClear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

function renderTopbar() {
  return render(
    <ThemeProvider>
      <Topbar />
    </ThemeProvider>,
  );
}

describe("Topbar v2 (app-shell.html)", () => {
  it("breadcrumb đổi theo pathname", async () => {
    nav.pathname = "/my-vocab";
    renderTopbar();
    expect(await screen.findByText("Sổ tay từ vựng")).toBeInTheDocument();
    expect(screen.queryByText("Lộ trình HSK")).not.toBeInTheDocument();
  });

  it("KHÔNG còn hamburger — mobile mở menu qua nút More của bottom-nav", () => {
    renderTopbar();
    expect(screen.queryByRole("button", { name: "Mở menu" })).not.toBeInTheDocument();
    expect(openNav).not.toHaveBeenCalled();
  });

  it("SearchTrigger (icon) mở command palette", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
    expect(await screen.findByRole("dialog", { name: "Tìm kiếm nhanh" })).toBeInTheDocument();
  });

  it("palette không nằm trong <header> (backdrop-blur sẽ khóa position:fixed)", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
    const dialog = await screen.findByRole("dialog", { name: "Tìm kiếm nhanh" });
    expect(dialog.closest("header")).toBeNull();
  });

  it("SearchTrigger là icon button đạt touch target 44px", () => {
    renderTopbar();
    const search = screen.getByRole("button", { name: "Tìm kiếm" });
    expect(search.className).toContain("min-h-11");
  });

  it("KHÔNG còn dòng ngày trong topbar", () => {
    const staticHtml = renderToStaticMarkup(
      <ThemeProvider>
        <Topbar />
      </ThemeProvider>,
    );
    expect(staticHtml).toContain("Lộ trình HSK"); // breadcrumb là dữ liệu tĩnh → vẫn có ngay
    expect(staticHtml).not.toContain("tháng");
  });

  it("⌘K mở command palette", async () => {
    renderTopbar();
    await userEvent.keyboard("{Meta>}k");
    expect(await screen.findByRole("dialog", { name: "Tìm kiếm nhanh" })).toBeInTheDocument();
  });

  it("có LevelPopover và StreakPill mini (icon + số, không chữ 'ngày')", async () => {
    localStorage.setItem("bye.streak", "12");
    renderTopbar();
    expect(screen.getByRole("button", { name: "Đổi cấp độ HSK" })).toBeInTheDocument();
    const pill = await screen.findByTitle("Chuỗi ngày học liên tục");
    await waitFor(() => expect(pill.textContent).toContain("12"));
    expect(pill.textContent).not.toContain("ngày");
  });

  it("theme toggle bật/tắt class dark", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Chuyển chế độ sáng tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("KHÔNG còn brand/avatar ở topbar (đã chuyển sang sidebar)", () => {
    renderTopbar();
    expect(screen.queryByText("HSK LEARNING")).not.toBeInTheDocument();
    expect(screen.queryByText("Bye")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đăng nhập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tài khoản" })).not.toBeInTheDocument();
  });

  it("không còn select ghi bye.goal — LevelPopover là chủ sở hữu duy nhất", () => {
    const { container } = renderTopbar();
    expect(container.querySelector("select")).toBeNull();
    expect(screen.queryByLabelText("Cấp độ HSK")).not.toBeInTheDocument();
  });
});
