import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  it("primary: nền jade, height tối thiểu 44", () => {
    render(<Button variant="primary">Lưu</Button>);
    const b = screen.getByRole("button", { name: "Lưu" });
    expect(b.className).toContain("bg-action-primary");
    expect(b.className).toContain("min-h-11"); // 44px
  });

  it("loading: giữ width (min-w theo nhãn) và disable", () => {
    render(<Button loading>Đang lưu</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button").className).toContain("min-w-28");
  });

  it("variant classes: secondary / danger / ghost", () => {
    const { rerender } = render(<Button variant="secondary">A</Button>);
    expect(screen.getByRole("button").className).toContain("bg-surface-elevated");
    rerender(<Button variant="danger">A</Button>);
    expect(screen.getByRole("button").className).toContain("bg-action-danger");
    rerender(<Button variant="ghost">A</Button>);
    expect(screen.getByRole("button").className).toContain("text-text-secondary");
  });

  it("size sm: min-h-9 (36px)", () => {
    render(<Button size="sm">Nhỏ</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-9");
  });

  it("focus-visible ring jade + disabled opacity", () => {
    render(<Button disabled>Ch×</Button>);
    const b = screen.getByRole("button");
    expect(b.className).toContain("focus-visible:ring-3");
    expect(b.className).toContain("ring-action-focus");
    expect(b.className).toContain("disabled:opacity-50");
  });
});
