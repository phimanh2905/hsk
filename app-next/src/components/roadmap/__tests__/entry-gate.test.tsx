import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EntryGate } from "../entry-gate";

/* useTts mock — object mutable để từng test chọn speaking true/false */
const tts = vi.hoisted(() => ({
  speak: vi.fn(),
  cancel: vi.fn(),
  speaking: false,
}));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => tts }));

const GATES_KEY = "bye.roadmap.gates.v1";

function answerQuestion(correct: boolean) {
  const opts = screen.getAllByTestId("gate-option");
  const target = opts.find((b) => b.getAttribute("data-correct") === (correct ? "true" : "false"))!;
  fireEvent.click(target);
  fireEvent.click(screen.getByRole("button", { name: /Câu tiếp|Xem kết quả/ }));
}

beforeEach(() => {
  localStorage.clear();
  tts.speak = vi.fn();
  tts.cancel = vi.fn();
  tts.speaking = false;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EntryGate", () => {
  it("exempt: hiển thị đã miễn, không có nút bắt đầu", () => {
    render(<EntryGate status="exempt" />);
    expect(screen.getByText(/Đã miễn kiểm tra đầu vào/i)).toBeTruthy();
    expect(screen.getByText(/Bạn đã hoàn thành chặng Pinyin/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bắt đầu/i })).toBeNull();
  });

  it("open: card gọn 'Đã qua cổng đầu vào', không có nút bắt đầu", () => {
    render(<EntryGate status="open" />);
    expect(screen.getByText(/Đã qua cổng đầu vào/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bắt đầu/i })).toBeNull();
  });

  it("locked: 12 câu, đúng 10/12 (≥80%) → gọi onPass + ghi gate best-of", () => {
    const onPass = vi.fn();
    render(<EntryGate status="locked" onPass={onPass} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));

    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId("gate-counter")).toHaveTextContent(`Câu ${i + 1}/12`);
      answerQuestion(i < 10); // 10 câu đầu đúng, 2 câu cuối sai
    }

    expect(onPass).toHaveBeenCalledTimes(1);
    const gates = JSON.parse(localStorage.getItem(GATES_KEY)!);
    expect(gates["hsk1"].pct).toBe(83); // round(10/12*100)
    expect(screen.getByTestId("gate-result")).toHaveTextContent(/10\/12/);
  });

  it("dưới 80% → không gọi onPass, hiện thông báo làm lại", () => {
    const onPass = vi.fn();
    render(<EntryGate status="locked" onPass={onPass} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));

    for (let i = 0; i < 12; i++) answerQuestion(false);

    expect(onPass).not.toHaveBeenCalled();
    expect(screen.getByTestId("gate-result")).toHaveTextContent(/Chưa đạt 80%/);
    expect(screen.getByRole("button", { name: /Làm lại/i })).toBeTruthy();
  });

  it("mỗi câu speak(hanzi); TTS không phát sau 1.5s → fallback câu đọc 'Từ nào đọc là'", () => {
    render(<EntryGate status="locked" />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));
    expect(tts.speak).toHaveBeenCalled();

    // chưa tới 1.5s: câu nghe (options pinyin)
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Nghe/i);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // fallback: câu đọc với options hanzi
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Từ nào đọc là/i);
  });

  it("TTS phát được (speaking=true) → giữ câu nghe, không fallback", () => {
    tts.speaking = true;
    render(<EntryGate status="locked" />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Nghe/i);
    expect(screen.queryByText(/Từ nào đọc là/i)).toBeNull();
  });
});
