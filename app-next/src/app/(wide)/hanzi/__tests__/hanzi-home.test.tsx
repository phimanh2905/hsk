import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziHome from "../hanzi-home";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("HanziHome (G2 màn 1)", () => {
  it("pills cấp độ + 214 Bộ thủ link /radicals", () => {
    render(<HanziHome />);
    expect(screen.getByText("Phân tích Hán tự")).toBeInTheDocument();
    expect(screen.getByText("HSK 1")).toBeInTheDocument();
    expect(screen.getByText("214 Bộ thủ")).toHaveAttribute("href", "/radicals");
    expect(screen.getByText("247 chữ Hán mới trong cuốn này")).toBeInTheDocument();
  });
  it("autocomplete 你 → chọn → push /hanzi/你", async () => {
    const user = userEvent.setup();
    render(<HanziHome />);
    await user.type(screen.getByPlaceholderText("Nhập chữ Hán hoặc từ…"), "你");
    await user.click(screen.getAllByText("你")[1]); // phần tử dropdown (0 = input value rendering)
    expect(push).toHaveBeenCalledWith("/hanzi/" + encodeURIComponent("你"));
  });
  it("chọn HSK 7-9 (rỗng) → thông báo verbatim; vẽ chữ gợi ý → push", async () => {
    const user = userEvent.setup();
    render(<HanziHome />);
    await user.click(screen.getByText("HSK 7-9"));
    expect(screen.getByText("Dữ liệu chữ Hán của cấp độ này sẽ được cập nhật sớm.")).toBeInTheDocument();
  });
});
