import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
});

function renderOpen() {
  return render(<CommandPalette open onClose={() => {}} />);
}

describe("CommandPalette", () => {
  it("open=true hiện dialog + input autofocus", () => {
    renderOpen();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Tìm kiếm")).toHaveFocus();
  });

  it("open=false không render gì", () => {
    const { container } = render(<CommandPalette open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("query rỗng vẫn hiện danh sách mặc định (Review Focus #3)", () => {
    renderOpen();
    expect(screen.getByRole("link", { name: /Trang chủ/ })).toBeInTheDocument();
  });

  it("gõ lọc theo substring không phân biệt hoa thường", async () => {
    renderOpen();
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "roadmap");
    expect(screen.getByRole("link", { name: /Lộ trình HSK/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Trang chủ" })).not.toBeInTheDocument();
  });

  it("Enter → router.push(href) của kết quả đầu", async () => {
    renderOpen();
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "pinyin{Enter}");
    expect(push).toHaveBeenCalledWith("/pinyin");
  });

  it("click kết quả → router.push", async () => {
    renderOpen();
    await userEvent.click(screen.getByRole("link", { name: /Ôn tập SRS/ }));
    expect(push).toHaveBeenCalledWith("/review");
  });

  it("Escape → onClose", async () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("không có kết quả → thông báo Không tìm thấy kết quả.", async () => {
    renderOpen();
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "zzzkhongco");
    expect(screen.getByText("Không tìm thấy kết quả.")).toBeInTheDocument();
  });
});
