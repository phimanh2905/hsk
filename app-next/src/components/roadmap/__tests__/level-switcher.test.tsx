import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelSwitcher } from "../level-switcher";

const levels = [
  { id: "hsk-1" as const, label: "HSK 1" },
  { id: "hsk-2" as const, label: "HSK 2" },
  { id: "hsk-3" as const, label: "HSK 3" },
  { id: "hsk-4-6" as const, label: "HSK 4–6" },
];

describe("LevelSwitcher", () => {
  it("render 4 nút, group aria-label đúng mock", () => {
    render(<LevelSwitcher levels={levels} value="hsk-2" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Chọn cấp độ HSK" })).toBeTruthy();
    for (const l of levels) expect(screen.getByRole("button", { name: l.label })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HSK 2" })).toHaveAttribute("aria-pressed", "true");
  });
  it("click gọi onChange với LevelId đúng", async () => {
    const onChange = vi.fn();
    render(<LevelSwitcher levels={levels} value="hsk-2" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "HSK 4–6" }));
    expect(onChange).toHaveBeenCalledWith("hsk-4-6");
  });
});
