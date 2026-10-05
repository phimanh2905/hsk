import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { LessonTopbar } from "../lesson-topbar";

function mount(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("LessonTopbar (port header[data-od-id=lesson-topbar] của opendesign lesson.html)", () => {
  it("hiển thị nhãn tiến độ + track jade với aria-valuenow", () => {
    mount(
      <LessonTopbar
        title="Bài 4: Sở thích & Thời gian rảnh"
        current={8}
        total={15}
        autoplay
        onToggleAutoplay={vi.fn()}
        onExit={vi.fn()}
        onShortcuts={vi.fn()}
      />
    );
    expect(screen.getByText(/Bài 4: Sở thích & Thời gian rảnh/)).toBeInTheDocument();
    expect(screen.getByText(/8\/15 từ/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tiến độ từ vựng" }).getAttribute("aria-valuenow")).toBe("53");
  });

  it("tile thoát + phím tắt gọi callback; autoplay thể hiện aria-pressed + dot", async () => {
    const onExit = vi.fn();
    const onShortcuts = vi.fn();
    const onToggle = vi.fn();
    mount(
      <LessonTopbar
        title="Bài 4"
        current={1}
        total={15}
        autoplay
        onToggleAutoplay={onToggle}
        onExit={onExit}
        onShortcuts={onShortcuts}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Thoát bài học" }));
    expect(onExit).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Phím tắt" }));
    expect(onShortcuts).toHaveBeenCalled();
    const auto = screen.getByRole("button", { name: "Tự động phát âm" });
    expect(auto.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(auto);
    expect(onToggle).toHaveBeenCalled();
  });

  it("tile theme chuyển sáng/tối qua ThemeProvider", async () => {
    mount(
      <LessonTopbar
        title="Bài 4"
        current={1}
        total={15}
        autoplay={false}
        onToggleAutoplay={vi.fn()}
        onExit={vi.fn()}
        onShortcuts={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Chế độ sáng tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("nhai.theme");
  });
});
