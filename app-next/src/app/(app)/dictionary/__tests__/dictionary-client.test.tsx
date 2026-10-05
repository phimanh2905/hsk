import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictionaryClient from "../dictionary-client";
import { progressStore } from "@/lib/store/progress-store";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dictionary");
});

describe("DictionaryClient (G1)", () => {
  it("không query → Gợi ý tra nhanh 5 pill", () => {
    render(<DictionaryClient />);
    expect(screen.getByText("Gợi ý tra nhanh")).toBeInTheDocument();
    for (const w of ["学习", "你好", "时间", "老师", "学生"]) expect(screen.getByText(w)).toBeInstanceOf(HTMLElement);
  });
  it("search xuexi → 5+ kết quả nhóm 学习, ?q= ghi URL (F5 giữ kết quả)", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "xuexi");
    await user.click(screen.getByText("Tra từ"));
    expect(screen.getByText(/kết quả cho/)).toBeInTheDocument();
    expect(window.location.search).toBe("?q=xuexi");
    expect(screen.getAllByText("(Phồn thể:").length).toBeGreaterThan(0); // 4/5 kết quả xuexi có phồn thể → getAllByText
  });
  it("URL ?q=你 → tự search lúc mount", () => {
    window.history.replaceState(null, "", "/dictionary?q=你");
    render(<DictionaryClient />);
    expect(screen.getByText(/kết quả cho/)).toBeInTheDocument();
  });
  it("⭐ Thêm vào sổ tay: lần 1 ghi bye.vocabBook, lần 2 toast trùng", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "学习");
    await user.click(screen.getByText("Tra từ"));
    const addBtn = screen.getAllByText(/Thêm vào sổ tay/)[0];
    await user.click(addBtn);
    expect(progressStore.getVocabBook()[0].hanzi).toBe("学习");
    expect(screen.getByText("Đã thêm vào Sổ tay từ vựng")).toBeInTheDocument();
    await user.click(screen.getAllByText(/Thêm vào sổ tay/)[0]);
    expect(screen.getByText("Từ này đã có trong Sổ tay từ vựng")).toBeInTheDocument();
  });
  it("nút xoá dọn cả URL về /dictionary + quay lại gợi ý", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "学习");
    await user.click(screen.getByText("Tra từ"));
    await user.click(screen.getByTitle("Xoá từ khoá"));
    expect(window.location.pathname + window.location.search).toBe("/dictionary");
    expect(screen.getByText("Gợi ý tra nhanh")).toBeInTheDocument();
  });
  it("không thấy → thông báo verbatim", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "zzzz");
    await user.click(screen.getByText("Tra từ"));
    expect(screen.getByText(/Không tìm thấy “zzzz”\. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt\./)).toBeInTheDocument();
  });
});
