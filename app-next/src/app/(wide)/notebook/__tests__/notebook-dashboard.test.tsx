import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotebookDashboard from "../notebook-dashboard";

const useNotebookEntries = vi.fn();
vi.mock("@/lib/notebook/use-notebook-entries", () => ({ useNotebookEntries: () => useNotebookEntries() }));
vi.mock("@/lib/use-session", () => ({ useSession: () => ({ loggedIn: false, isPending: false, name: "M", image: null, logout: async () => {} }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => toastMock, useToastSafe: () => toastMock }));
const toastMock = vi.fn();

import { notebookBooks } from "@/content/notebook-books";
import type { NotebookEntry } from "@/lib/notebook/entries";

const NOW = new Date("2026-10-05T10:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const wrongEntry = (over: Partial<NotebookEntry> = {}): NotebookEntry => ({
  id: "w1", kind: "wrong", tag: "🛑 Lỗi sai trong bài thi thử HSK 4", tagTone: "red",
  payload: { q: "昨天太累了…", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "Nguyên nhân…" },
  saved: false, hsk: "HSK4", source: "auto", createdAt: day(2), updatedAt: day(2), ...over,
});
const emptyApi = { ready: true, create: vi.fn(), setSaved: vi.fn(), remove: vi.fn() };

beforeEach(() => { localStorage.clear(); toastMock.mockClear(); useNotebookEntries.mockReset(); });

describe("hero (port notebook-hero)", () => {
  it("đếm động: 2 wrong tuần này chưa ghim → h1 + CTA 'Ôn tập 2 lỗi sai ngay'", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ id: "a" }), wrongEntry({ id: "b" })] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("notebook-hero")).toHaveTextContent("Có 2 câu làm sai tuần này");
    expect(screen.getByTestId("notebook-cta")).toHaveTextContent("Ôn tập 2 lỗi sai ngay");
    expect(screen.getByTestId("notebook-cta")).toHaveAttribute("href", "/review");
    expect(screen.getByText("📝 2 Mục ghi chép")).toBeInTheDocument();
    expect(screen.getByText("🛡️ Đã khắc phục: —%")).toBeInTheDocument();
  });
  it("không có wrong → h1 khích lệ + '—%'", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("notebook-hero")).toHaveTextContent("Chưa có câu sai nào tuần này");
  });
});

describe("shelf (port notebook-shelf)", () => {
  it("4 sổ: mistakes số liệu thật + 3 sổ tĩnh; CTA sổ tĩnh → toast", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("SỔ CÂU LÀM SAI");
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("1 câu hỏi cần nhớ");
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("Cần xử lý: 1 câu");
    for (const b of notebookBooks) expect(screen.getByTestId(`book-${b.id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Luyện phân biệt" }));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Sắp có"));
  });
  it("CTA 'Mở sổ lỗi sai' → filter wrong active", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở sổ lỗi sai" }));
    expect(screen.getByRole("button", { name: "Câu sai chưa sửa" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("search + filters (port notebook-search stream-filters)", () => {
  it("phím / focus ô search", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.keyDown(document, { key: "/" });
    expect(screen.getByLabelText("Tìm kiếm trong tất cả sổ tay")).toHaveFocus();
  });
  it("search lọc theo nội dung payload", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ id: "a" }), wrongEntry({ id: "b", payload: { q: "Khaled", wrong: null, right: { zh: "x" }, cause: "y" } })] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.change(screen.getByLabelText("Tìm kiếm trong tất cả sổ tay"), { target: { value: "khaled" } });
    expect(screen.getAllByTestId(/^note-/)).toHaveLength(1);
  });
});
