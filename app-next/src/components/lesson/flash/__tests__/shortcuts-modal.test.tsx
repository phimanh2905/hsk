import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsModal } from "../shortcuts-modal";

describe("ShortcutsModal (port #keysModal của opendesign lesson.html)", () => {
  it("liệt kê đủ 6 phím tắt", () => {
    render(<ShortcutsModal open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Phím tắt học nhanh" })).toBeInTheDocument();
    for (const key of ["Space", "1", "2", "3", "R", "Esc"]) {
      expect(screen.getAllByText(key).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Lật / xem nghĩa · phát lại audio")).toBeInTheDocument();
  });

  it("Đã hiểu → đóng", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
    expect(onClose).toHaveBeenCalled();
  });
});
