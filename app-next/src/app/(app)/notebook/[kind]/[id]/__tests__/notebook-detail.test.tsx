import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import NotebookDetail from "../notebook-detail";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

beforeEach(() => localStorage.clear());

describe("NotebookDetail (F5)", () => {
  it("deck user không có rows → fallback 12 dòng mẫu của sample đầu; kind quyết định storage (fix round-1)", () => {
    localStorage.setItem("nhai.notebooks", JSON.stringify([
      { id: "nb-g1", name: "Sổ ngữ pháp của tôi", rows: [], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="grammar" id="nb-g1" />);
    expect(screen.getByRole("heading", { name: /Sổ ngữ pháp của tôi/ })).toBeInTheDocument();
    expect(screen.getByText("时间")).toBeInTheDocument(); // MOCK_ROWS[0]
    expect(screen.getByText("← Sổ tay ngữ pháp")).toHaveAttribute("href", "/my-grammar");
    expect(screen.getByText("Chữ")).toBeInTheDocument();
    expect(screen.getByText("Nghĩa")).toBeInTheDocument();
  });
  it("user rows có nội dung → hiện rows user (hanviet thường giữ nguyên)", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "nb-1", name: "Bộ thử", rows: [{ hanzi: "朋友", pinyin: "péngyou", hanviet: "bằng hữu", meaning: "bạn bè" }], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="vocab" id="nb-1" />);
    expect(screen.getByText("朋友")).toBeInTheDocument();
    expect(screen.getByText("bằng hữu")).toBeInTheDocument();
    expect(screen.queryByText("时间")).not.toBeInTheDocument();
  });
  it("bấm ＋ Thêm từ → toast demo (SP1 không fake bảng editable)", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "nb-1", name: "Bộ thử", rows: [], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="vocab" id="nb-1" />);
    act(() => screen.getByText("＋ Thêm từ").click());
    expect(screen.getByText("Thêm từ vào sổ tay — sắp có (demo)")).toBeInTheDocument();
  });
  it("sample id (không ở store) → title + rows từ sample", () => {
    render(<NotebookDetail kind="vocab" id="vocab-textbook" />);
    expect(screen.getByRole("heading", { name: /Từ trong sách giáo khoa/ })).toBeInTheDocument();
  });
});
