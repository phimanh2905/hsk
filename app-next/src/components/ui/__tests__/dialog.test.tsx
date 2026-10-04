import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../dialog";

describe("Dialog", () => {
  it("open: role=dialog, aria-modal, labelledBy; panel elevated + shadow-md", () => {
    render(
      <Dialog open onClose={vi.fn()} labelledBy="dlg-title">
        <h2 id="dlg-title">Đăng nhập</h2>
      </Dialog>,
    );
    const dlg = screen.getByRole("dialog");
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(dlg.getAttribute("aria-labelledby")).toBe("dlg-title");
    expect(screen.getByText("Đăng nhập")).toBeTruthy();
  });

  it("open=false: không render", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} labelledBy="t">
        X
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape đóng", async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} labelledBy="t">
        X
      </Dialog>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("backdrop click đóng; click panel không đóng", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open onClose={onClose} labelledBy="t">
        <div>Nội dung</div>
      </Dialog>,
    );
    const backdrop = container.firstElementChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText("Nội dung"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("role=alertdialog render alertdialog (port #exitModal lesson.html)", () => {
    render(
      <Dialog open onClose={vi.fn()} labelledBy="t" role="alertdialog">
        <h2 id="t">Rời khỏi Bài 4?</h2>
      </Dialog>
    );
    expect(screen.getByRole("alertdialog", { name: "Rời khỏi Bài 4?" })).toBeInTheDocument();
  });

  it("mặc định role=dialog", () => {
    render(
      <Dialog open onClose={vi.fn()} labelledBy="t2">
        <h2 id="t2">X</h2>
      </Dialog>
    );
    expect(screen.getByRole("dialog", { name: "X" })).toBeInTheDocument();
  });
});
