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
