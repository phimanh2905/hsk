import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotebookList, fmtRelativeDate } from "../notebook-list";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => localStorage.clear());

describe("fmtRelativeDate", () => {
  it("Hôm nay / Hôm qua / N ngày trước", () => {
    const now = new Date();
    expect(fmtRelativeDate(now.toISOString())).toBe("Hôm nay");
    expect(fmtRelativeDate(new Date(now.getTime() - 86400000).toISOString())).toBe("Hôm qua");
    expect(fmtRelativeDate(new Date(now.getTime() - 5 * 86400000).toISOString())).toBe("5 ngày trước");
  });
});

describe("NotebookList (F3/F4)", () => {
  it("kind=vocab: H1/sub/cta/empty đúng SPEC-18, samples luôn render sau items", () => {
    render(<NotebookList kind="vocab" />);
    expect(screen.getByRole("heading", { name: /Sổ tay từ vựng/ })).toBeInTheDocument();
    expect(screen.getByText("Tự tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn…")).toBeInTheDocument();
    expect(screen.getAllByText("Tạo bộ mới").length).toBe(2); // CTA header + empty CTA
    expect(screen.getByText("Chưa có bộ từ vựng nào")).toBeInTheDocument();
    expect(screen.getByText("Từ vực HSK 3.0")).toBeInTheDocument(); // sample vẫn hiện khi store rỗng
    expect(screen.getAllByText("Sổ mẫu").length).toBe(3); // badge mỗi sample card (vocab có 3 samples)
  });
  it("modal tạo: nút Tạo disabled khi rỗng, Enter submit, prepend + toast + persist", async () => {
    const user = userEvent.setup();
    render(<NotebookList kind="vocab" />);
    await user.click(screen.getAllByText("Tạo bộ mới")[0]);
    const input = screen.getByPlaceholderText("Nhập tên sổ tay / bộ từ vựng…");
    expect(screen.getByText("Tạo")).toBeDisabled();
    await user.type(input, "Từ vựng giáo trình 2");
    expect(screen.getByText("Tạo")).toBeEnabled();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Đã tạo Từ vựng giáo trình 2")).toBeInTheDocument();
    expect(screen.getAllByText("Từ vựng giáo trình 2").length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem("bye.decks")!);
    expect(stored[0].name).toBe("Từ vựng giáo trình 2"); // prepend
  });
  it("kind=grammar đọc bye.notebooks — hai route dùng 1 template", () => {
    render(<NotebookList kind="grammar" />);
    expect(screen.getByRole("heading", { name: /Sổ tay ngữ pháp/ })).toBeInTheDocument();
    expect(screen.getByText("Mẫu câu gọi thoại")).toBeInTheDocument(); // 2 sample grammar
    expect(screen.getByText("Ngữ pháp hay sai")).toBeInTheDocument();
  });
  it("xoá deck qua menu ⋯ với confirm", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", () => true);
    render(<NotebookList kind="vocab" />);
    await user.click(screen.getAllByText("Tạo bộ mới")[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên sổ tay / bộ từ vựng…"), "Bộ xoá");
    await user.click(screen.getByText("Tạo"));
    await user.click(screen.getByRole("button", { name: "Tuỳ chọn" }));
    await user.click(screen.getByText("Xoá"));
    expect(screen.getByText("Đã xoá Bộ xoá")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("bye.decks")!)).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
