import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { IconTile } from "../icon-tile";

describe("IconTile", () => {
  it("ô 40px rounded-control nền surface-muted", () => {
    const { container } = render(<IconTile>x</IconTile>);
    expect(container.firstElementChild!.className).toContain("h-10");
    expect(container.firstElementChild!.className).toContain("rounded-control");
    expect(container.firstElementChild!.className).toContain("bg-surface-muted");
  });
  it("tone amber đổ màu learning-streak", () => {
    const { container } = render(<IconTile tone="amber">x</IconTile>);
    expect(container.firstElementChild!.className).toContain("text-learning-streak");
  });
});
