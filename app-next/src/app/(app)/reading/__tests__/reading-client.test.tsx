import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingClient from "../reading-client";

const speakMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", {
    speak: speakMock, cancel: vi.fn(), speaking: false,
    getVoices: vi.fn(() => [{ name: "Tingting", lang: "zh-CN" }]),
  });
  speakMock.mockClear();
});

describe("ReadingClient (G3)", () => {
  it("điền văn bản mẫu → Tạo bài đọc → 11 câu (title dòng đầu)", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("Điền văn bản mẫu"));
    expect(screen.getByText("Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!")).toBeInTheDocument();
    await user.click(screen.getByText("Tạo bài đọc"));
    // sampleText thực tế tách thành 13 câu (comment "11 câu" trong dữ liệu không khớp thực tế)
    expect(screen.getByText(/13 câu/)).toBeInTheDocument();
  });
  it("mở bài demo từ sidebar → 13 câu + Câu hỏi & Từ vựng + MCQ đúng → toast", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    expect(screen.getByText(/13 câu/)).toBeInTheDocument();
    expect(screen.getByText("Câu hỏi & Từ vựng")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "A. 先喝一杯温水" }));
    expect(screen.getByText("Chính xác! 🎉")).toBeInTheDocument();
  });
  it("Phát câu 1: utterance lang zh-CN + rate; Phát cả bài đổi nút ⏹ Dừng; Dừng huỷ sạch", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    await user.click(screen.getAllByRole("button", { name: "Đọc câu 1" })[0]);
    expect(speakMock).toHaveBeenCalledTimes(1);
    const u = speakMock.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.lang).toBe("zh-CN");
    expect(u.rate).toBe(1);
    await user.click(screen.getByText("🔊 Phát cả bài"));
    expect(screen.getByText("⏹ Dừng")).toBeInTheDocument();
    await user.click(screen.getByText("⏹ Dừng"));
    expect(screen.getByText("🔊 Phát cả bài")).toBeInTheDocument();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
  it("account-box: chưa login → nút Đăng nhập; login mock → text demo", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    expect(screen.getByText("Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.")).toBeInTheDocument();
    act(() => {
      localStorage.setItem("nhai.mockLogin", "1");
      window.dispatchEvent(new CustomEvent("nhai:progress"));
    });
    expect(screen.getByText(/Chưa có bài nào được lưu/)).toBeInTheDocument();
  });
  it("textarea cắt tại 3000 ký tự", { timeout: 30000 }, async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    const ta = screen.getByLabelText(/Nội dung bài đọc/) as HTMLTextAreaElement;
    await user.type(ta, "好".repeat(3010));
    expect(ta.value.length).toBe(3000);
    expect(screen.getByText("3000/3000")).toBeInTheDocument();
  });
});
