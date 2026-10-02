import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "../icon-button";
import { Home } from "../../ui/icon";

describe("IconButton", () => {
  it("label → aria-label bắt buộc, min 44px", () => {
    render(
      <IconButton label="Trang chủ">
        <Home size={20} strokeWidth={1.5} />
      </IconButton>,
    );
    const b = screen.getByRole("button", { name: "Trang chủ" });
    expect(b.getAttribute("aria-label")).toBe("Trang chủ");
    expect(b.className).toContain("min-h-11");
    expect(b.className).toContain("min-w-11");
  });

  it("variant ghost mặc định; solid nền jade", () => {
    const { rerender } = render(
      <IconButton label="A">
        <Home />
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("bg-transparent");
    rerender(
      <IconButton label="A" variant="solid">
        <Home />
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("bg-action-primary");
  });

  it("focus ring jade + click hoạt động", async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="A" onClick={onClick}>
        <Home />
      </IconButton>,
    );
    const b = screen.getByRole("button");
    expect(b.className).toContain("focus-visible:ring-3");
    expect(b.className).toContain("ring-action-focus");
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
