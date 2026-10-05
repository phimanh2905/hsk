import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelPopover } from "../level-popover";

beforeEach(() => localStorage.clear());

describe("LevelPopover", () => {
  it("đóng mặc định, mở khi click nút", async () => {
    render(<LevelPopover />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("4 mục HSK, item đang chọn có aria-checked=true", async () => {
    localStorage.setItem("nhai.goal", "HSK 3");
    render(<LevelPopover />);
    await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
    for (const l of ["HSK 1", "HSK 2", "HSK 3", "HSK 4"]) {
      expect(screen.getByRole("menuitemradio", { name: new RegExp(l) })).toBeInTheDocument();
    }
    expect(screen.getByRole("menuitemradio", { name: /HSK 3/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: /HSK 1/ })).toHaveAttribute("aria-checked", "false");
  });

  it("chọn mục → lưu nhai.goal và popover đóng (Review Focus #4)", async () => {
    render(<LevelPopover />);
    await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: /HSK 4/ }));
    expect(localStorage.getItem("nhai.goal")).toBe("HSK 4");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Escape và click ngoài đóng popover", async () => {
    render(
      <>
        <LevelPopover />
        <span data-testid="outside">ngoài</span>
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("nút hiện level đang chọn", async () => {
    localStorage.setItem("nhai.goal", "HSK 4");
    render(<LevelPopover />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Đổi cấp độ HSK" }).textContent).toContain("HSK 4"));
  });

  /* F3: Escape khi popover mở KHÔNG được rò xuống listener document/window khác
     (hotkey lesson qua useKeyboard trên window, exit modal...) — popover là chủ nhân
     duy nhất của Escape khi đang mở. Mutation-verify: bỏ stopPropagation → test fail. */
  it("Escape xử lý bởi popover → listener document/window khác không nhận Escape (F3)", async () => {
    const docSpy = vi.fn();
    const winSpy = vi.fn();
    const docListener = (e: KeyboardEvent) => e.key === "Escape" && docSpy();
    const winListener = (e: KeyboardEvent) => e.key === "Escape" && winSpy();
    document.addEventListener("keydown", docListener);
    window.addEventListener("keydown", winListener);
    try {
      render(<LevelPopover />);
      await userEvent.click(screen.getByRole("button", { name: "Đổi cấp độ HSK" }));
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(docSpy).not.toHaveBeenCalled();
      expect(winSpy).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", docListener);
      window.removeEventListener("keydown", winListener);
    }
  });

  /* F1: Escape đóng popover → focus trả về trigger, không rơi xuống <body>. */
  it("Escape đóng popover → focus trả về trigger (F1)", async () => {
    render(<LevelPopover />);
    const trigger = screen.getByRole("button", { name: "Đổi cấp độ HSK" });
    await userEvent.click(trigger);
    const item = screen.getByRole("menuitemradio", { name: /HSK 3/ });
    item.focus();
    expect(item).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  /* F1: chọn mục làm item đang focus bị unmount → focus quay về trigger. */
  it("chọn mục → focus trả về trigger (F1)", async () => {
    render(<LevelPopover />);
    const trigger = screen.getByRole("button", { name: "Đổi cấp độ HSK" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitemradio", { name: /HSK 4/ }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  /* F2: trigger đạt min touch target 44px (min-h-11), không phải h-10. */
  it("trigger cao tối thiểu 44px cho touch target (F2)", () => {
    render(<LevelPopover />);
    const cls = screen.getByRole("button", { name: "Đổi cấp độ HSK" }).className;
    expect(cls).toContain("min-h-11");
    expect(cls).not.toContain("h-10");
  });
});
