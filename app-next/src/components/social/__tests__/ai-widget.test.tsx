import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AiWidget from "../ai-widget";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

beforeEach(() => {
  localStorage.clear();
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const REPLY = "Mình là bản demo — thử bấm biểu tượng ngôi sao trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!";

describe("AiWidget", () => {
  it("mở panel, gửi câu hỏi → bubble user ngay, bubble AI đúng text sau 400ms", () => {
    render(<AiWidget />);
    fireEvent.click(screen.getByRole("button", { name: /Hỏi AI/ }));
    fireEvent.change(screen.getByPlaceholderText("Nhập câu hỏi…"), { target: { value: "HSK 1 học gì?" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi" }));

    expect(screen.getByText("HSK 1 học gì?")).toBeInTheDocument();
    expect(screen.queryByText(REPLY)).toBeNull(); // chưa đủ 400ms

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText(REPLY)).toBeInTheDocument();
    expect((screen.getByPlaceholderText("Nhập câu hỏi…") as HTMLInputElement).value).toBe("");
  });

  it("Enter cũng gửi; input rỗng thì không gửi", () => {
    render(<AiWidget />);
    fireEvent.click(screen.getByRole("button", { name: /Hỏi AI/ }));
    const input = screen.getByPlaceholderText("Nhập câu hỏi…");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByText(REPLY)).toBeNull();
  });

  it("nhai.chatBubble=0 ẩn nút mascot; nút Ủng hộ hiện toast đúng", () => {
    localStorage.setItem("nhai.chatBubble", "0");
    render(<AiWidget />);
    expect(screen.queryByRole("button", { name: /Hỏi AI/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ủng hộ Nhai HSK/ }));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Cảm ơn bạn đã ủng hộ Nhai HSK!");
  });
});
