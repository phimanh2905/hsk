import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

describe("stream cards (port mistake-stream)", () => {
  const setSaved = vi.fn();
  beforeEach(() => setSaved.mockClear());
  it("card wrong: q + 2 dòng contrast + cause + CTA /review + time", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, setSaved, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    const card = screen.getByTestId("note-w1");
    expect(within(card).getByText("昨天太累了…")).toBeInTheDocument();
    expect(within(card).getByText(/Bạn đã chọn:/)).toBeInTheDocument();
    expect(within(card).getByText(/Đáp án đúng:/)).toBeInTheDocument();
    expect(within(card).getByText(/Điểm mấu chốt:/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Thử thách lại câu này" })).toHaveAttribute("href", "/review");
  });
  it("card wrong null → 'Bạn chưa nhớ:' thay dòng sai", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" } })] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByText(/Bạn chưa nhớ:/)).toBeInTheDocument();
  });
  it("card chars: bigchars + tip + CTA /hanzi; card personal: note, không CTA", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [
      wrongEntry({ id: "c1", kind: "chars", tagTone: "lav", tag: "🔍 Cặp chữ dễ nhầm", payload: { chars: [{ zh: "已", py: "yǐ" }, { zh: "己", py: "jǐ" }], tip: "Mẹo nhớ…" }, source: "manual" }),
      wrongEntry({ id: "p1", kind: "personal", tagTone: "per", tag: "📝 Ghi chú cá nhân", payload: { note: "Khi từ chối…" }, source: "manual" }),
    ] });
    render(<NotebookDashboard now={NOW} />);
    // filter mặc định "wrong" (spec §2.4) — bấm "Tất cả mục" để thấy chars/personal
    fireEvent.click(screen.getByRole("button", { name: "Tất cả mục" }));
    const c = screen.getByTestId("note-c1");
    expect(within(c).getByText("vs")).toBeInTheDocument();
    expect(within(c).getByRole("link", { name: "Xem bút thuận nét viết" })).toHaveAttribute("href", "/hanzi");
    const p = screen.getByTestId("note-p1");
    expect(within(p).getByText("Khi từ chối…")).toBeInTheDocument();
    expect(within(p).queryByRole("link")).toBeNull();
  });
  it("★ ghim: aria-pressed + gọi setSaved + toast", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, setSaved, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    const star = screen.getByRole("button", { name: "Yêu thích" });
    expect(star).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(star);
    expect(setSaved).toHaveBeenCalledWith("w1", true);
    expect(toastMock).toHaveBeenCalledWith("Đã ghim ★ ghi chú");
  });
  it("payload hỏng → card bị bỏ qua; filter rỗng → empty state", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [{ ...wrongEntry(), payload: "x" as unknown as NotebookEntry["payload"] }] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("stream-empty")).toHaveTextContent(/Không có mục nào khớp/);
  });
  it("⋮ mở menu tùy chọn → toast demo", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Tùy chọn" }));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Tùy chọn"));
  });
});
