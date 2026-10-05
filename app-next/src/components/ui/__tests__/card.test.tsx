import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "../card";

describe("Card", () => {
  it("rounded-card + border + p-6, shadow mặc định xs", () => {
    const { container } = render(<Card>Nội dung</Card>);
    const c = container.firstElementChild as HTMLElement;
    expect(c.className).toContain("rounded-card");
    expect(c.className).toContain("border-border-default");
    expect(c.className).toContain("p-6");
    expect(c.className).toContain("shadow-xs");
  });

  it("shadow none/md theo prop", () => {
    const { container, rerender } = render(<Card shadow="none">X</Card>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain("shadow-xs");
    rerender(<Card shadow="md">X</Card>);
    expect((container.firstElementChild as HTMLElement).className).toContain("shadow-md");
  });
});

describe("Card tone", () => {
  it("tone rose → bg-rose-wash; không tone → bg-surface-elevated", () => {
    const { container, rerender } = render(<Card tone="rose" />);
    expect(container.firstElementChild!.className).toContain("bg-rose-wash");
    rerender(<Card />);
    expect(container.firstElementChild!.className).toContain("bg-surface-elevated");
  });
  it("tone amber/jade map đúng wash", () => {
    const { container, rerender } = render(<Card tone="amber" />);
    expect(container.firstElementChild!.className).toContain("bg-amber-wash");
    rerender(<Card tone="jade" />);
    expect(container.firstElementChild!.className).toContain("bg-jade-wash");
  });
});
