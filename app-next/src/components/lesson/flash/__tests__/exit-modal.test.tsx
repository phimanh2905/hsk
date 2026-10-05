import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExitModal } from "../exit-modal";
import { Kbd } from "../kbd";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("ExitModal (port #exitModal của opendesign lesson.html)", () => {
  it("alertdialog confirm thoát với tên bài", () => {
    render(<ExitModal open onClose={vi.fn()} lessonTitle="Bài 4: Sở thích & Thời gian rảnh" />);
    expect(screen.getByRole("alertdialog", { name: "Rời khỏi Bài 4: Sở thích & Thời gian rảnh?" })).toBeInTheDocument();
    expect(screen.getByText(/Tiến độ đã được lưu/)).toBeInTheDocument();
  });

  it("Ở lại học → đóng; Về lộ trình → router.push /roadmap", async () => {
    const onClose = vi.fn();
    render(<ExitModal open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Ở lại học" }));
    expect(onClose).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Về lộ trình" }));
    expect(push).toHaveBeenCalledWith("/roadmap");
  });

  it("open=false → không render", () => {
    render(<ExitModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("Kbd (port .hint kbd/.keys kbd)", () => {
  it("kbd viền + nền surface muted", () => {
    const { container } = render(<Kbd>Space</Kbd>);
    const kbd = container.querySelector("kbd")!;
    expect(kbd.textContent).toBe("Space");
    expect(kbd.className).toContain("border-border-default");
    expect(kbd.className).toContain("bg-surface-muted");
  });
});
