import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "../search-field";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("SearchField", () => {
  it("Enter với query → push /dictionary?q= đã encode", async () => {
    render(<SearchField />);
    const input = screen.getByLabelText("Tìm kiếm");
    await userEvent.type(input, "爱好 học{Enter}");
    expect(push).toHaveBeenCalledWith("/dictionary?q=" + encodeURIComponent("爱好 học"));
  });
  it("Enter với query rỗng/chỉ space → không navigate", async () => {
    push.mockClear();
    render(<SearchField />);
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "   {Enter}");
    expect(push).not.toHaveBeenCalled();
  });
  it("⌘K focus input", async () => {
    render(<SearchField />);
    const input = screen.getByLabelText("Tìm kiếm");
    await userEvent.keyboard("{Meta>}k");
    expect(input).toHaveFocus();
  });
});
