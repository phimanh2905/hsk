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

  it("đóng palette → focus trả về phần tử đã mở (A1)", async () => {
    const onClose = vi.fn();
    const shell = (open: boolean) => (
      <>
        <button type="button">Tìm kiếm nhanh</button>
        <CommandPalette open={open} onClose={onClose} />
      </>
    );
    const { rerender } = render(shell(false));
    const trigger = screen.getByRole("button", { name: "Tìm kiếm nhanh" });
    await userEvent.click(trigger); // người dùng bấm SearchTrigger → trigger nhận focus thật
    rerender(shell(true));
    expect(screen.getByLabelText("Tìm kiếm")).toHaveFocus();
    rerender(shell(false));
    expect(trigger).toHaveFocus();
  });

  it("Tab từ kết quả cuối quay lại input — focus trap (A2)", async () => {
    renderOpen();
    const links = screen.getAllByRole("link");
    links[links.length - 1].focus();
    await userEvent.tab();
    expect(screen.getByLabelText("Tìm kiếm")).toHaveFocus();
  });

  it("Shift+Tab từ input quay lại kết quả cuối — focus trap (A2)", async () => {
    renderOpen();
    expect(screen.getByLabelText("Tìm kiếm")).toHaveFocus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    const links = screen.getAllByRole("link");
    expect(links[links.length - 1]).toHaveFocus();
  });

  it("ctrl/cmd-click không bị preventDefault (mở tab mới được), click thường thì có (B1)", () => {
    renderOpen();
    const link = screen.getByRole("link", { name: /Trang chủ/ });

    const mod = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(mod);
    expect(mod.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();

    const plain = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("lọc 'khoá'/'course' hiện link Khoá học → /course (F4: /course còn đường tới qua palette)", async () => {
    const input = renderOpen().getByLabelText("Tìm kiếm") as HTMLInputElement;

    await userEvent.type(input, "khoá");
    expect(screen.getByRole("link", { name: /Khoá học/ })).toHaveAttribute("href", "/course");

    await userEvent.clear(input);
    await userEvent.type(input, "course");
    expect(screen.getByRole("link", { name: /Khoá học/ })).toHaveAttribute("href", "/course");
  });

  it("lọc rộng vẫn chỉ hiện tối đa 8 kết quả (A3)", async () => {
    renderOpen();
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "a");
    // Bỏ .slice(0, MAX_RESULTS) là fail ngay ở đây: query "a" khớp hơn 8 mục (route + tiêu đề bài).
    expect(screen.getAllByRole("link")).toHaveLength(8);
  });

  it("kết quả gồm tiêu đề bài học thật từ content/vocab (A4 — nhánh vocab)", async () => {
    renderOpen();
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "gia đình");
    const link = screen.getByRole("link", { name: /Gia đình/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dictionary");
    // Label = `${title} · ${hanzi từ đầu tiên}` — lấy thật từ content/vocab hsk1/lesson-2.
    expect(link).toHaveTextContent("Gia đình · 爸爸");
  });
});
