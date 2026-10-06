import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScaffoldBar } from "../scaffold-bar";

describe("ScaffoldBar", () => {
  it("đổi mode → onScaf nhận mode mới", async () => {
    const user = userEvent.setup();
    const onScaf = vi.fn();
    render(<ScaffoldBar scaf="hanzi" onScaf={onScaf} follow={false} onFollow={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Pinyin" }));
    expect(onScaf).toHaveBeenCalledWith("pinyin");
    await user.click(screen.getByRole("button", { name: "Hán Việt" }));
    expect(onScaf).toHaveBeenCalledWith("hanviet");
  });

  it("mode hiện tại aria-pressed=true", () => {
    render(<ScaffoldBar scaf="pinyin" onScaf={vi.fn()} follow={false} onFollow={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pinyin" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Hán tự" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("checkbox toggle → onFollow(true/false)", async () => {
    const user = userEvent.setup();
    const onFollow = vi.fn();
    const { rerender } = render(
      <ScaffoldBar scaf="hanzi" onScaf={vi.fn()} follow={false} onFollow={onFollow} />,
    );
    const cb = screen.getByRole("checkbox", { name: "Cuộn theo giọng đọc" });
    await user.click(cb);
    expect(onFollow).toHaveBeenCalledWith(true);
    rerender(<ScaffoldBar scaf="hanzi" onScaf={vi.fn()} follow onFollow={onFollow} />);
    await user.click(screen.getByRole("checkbox", { name: "Cuộn theo giọng đọc" }));
    expect(onFollow).toHaveBeenLastCalledWith(false);
  });
});
