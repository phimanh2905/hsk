import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "../chip";
import { Flame } from "../../ui/icon";

describe("Chip", () => {
  it("mặc định neutral: min-h-11 inline-flex", () => {
    render(<Chip>Từ mới</Chip>);
    const c = screen.getByText("Từ mới");
    expect(c.className).toContain("min-h-11");
    expect(c.className).toContain("inline-flex");
  });

  it("state matrix: selected/correct/error/streak/ai", () => {
    const { rerender } = render(<Chip tone="selected">S</Chip>);
    const cls = () => screen.getByText("S").className;
    expect(cls()).toContain("bg-action-primary");
    expect(cls()).toContain("text-white");
    rerender(<Chip tone="correct">S</Chip>);
    expect(cls()).toContain("text-feedback-success");
    rerender(<Chip tone="error">S</Chip>);
    expect(cls()).toContain("text-feedback-error");
    rerender(<Chip tone="streak">S</Chip>);
    expect(cls()).toContain("text-learning-streak");
    rerender(<Chip tone="ai">S</Chip>);
    expect(cls()).toContain("text-feature-ai");
  });

  it("selected (boolean) như tone selected", () => {
    render(<Chip selected>S</Chip>);
    expect(screen.getByText("S").className).toContain("bg-action-primary");
  });

  it("onClick → button; icon hiển thị kèm", async () => {
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} icon={<Flame size={16} strokeWidth={1.5} />}>
        7 ngày
      </Chip>,
    );
    const b = screen.getByRole("button", { name: /7 ngày/ });
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("Chip — status tones (spec 2026-10-04)", () => {
  it("tone doing: nền surface-muted, chữ text-primary", () => {
    render(<Chip tone="doing">ĐANG THỰC HIỆN</Chip>);
    const cls = screen.getByText("ĐANG THỰC HIỆN").className;
    expect(cls).toContain("bg-surface-muted");
    expect(cls).toContain("text-text-primary");
  });
  it("tone todo: nền amber-wash, chữ amber-ink", () => {
    render(<Chip tone="todo">CẦN LÀM</Chip>);
    const cls = screen.getByText("CẦN LÀM").className;
    expect(cls).toContain("bg-amber-wash");
    expect(cls).toContain("text-amber-ink");
  });
  it("tone idle: trong suốt, chữ secondary", () => {
    render(<Chip tone="idle">CHƯA BẮT ĐẦU</Chip>);
    const cls = screen.getByText("CHƯA BẮT ĐẦU").className;
    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("text-text-secondary");
  });
});
