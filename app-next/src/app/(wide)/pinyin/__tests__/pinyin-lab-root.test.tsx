import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import PinyinLabRoot from "../pinyin-lab-root";
import { progressStore } from "@/lib/store/progress-store";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

beforeEach(() => {
  speakMock.mockClear();
  vi.spyOn(progressStore, "addXp").mockImplementation(() => {});
  vi.spyOn(progressStore, "recordPinyinLabResult").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanup();
});

describe("PinyinLabRoot — ma trận", () => {
  it("mặc định mode matrix: tone lab + toolbar + matrix + inspector; số đếm động", () => {
    render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    expect(getByODId("tone-lab")).toBeTruthy();
    expect(getByODId("mode-switcher").textContent).toContain("Ma trận âm & 4 thanh điệu");
    expect(document.body.textContent).toContain("Thanh mẫu (23)");
    expect(document.body.textContent).toContain("Vận mẫu (36)");
    expect(document.body.textContent).toContain("Biến âm (一 · 不 · 3声)");
    expect(getByODId("sound-matrix")).toBeTruthy();
    expect(getByODId("sound-inspector")).toBeTruthy();
  });

  it("cat 'Biến âm' → sandhi thay split pane", () => {
    const { getByText } = render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    act(() => getByText("Biến âm (一 · 不 · 3声)").click());
    expect(getByODId("sandhi-rules")).toBeTruthy();
    expect(document.querySelector('[data-od-id="sound-matrix"]')).toBeNull();
  });

  it("chọn ô → inspector đổi + speak BASE; drill → mode quiz + phát câu đầu", () => {
    const { container, getByText } = render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    act(() => (container.querySelector('[data-ini="g"]') as HTMLElement).click());
    expect(document.body.textContent).toContain("Âm đang chọn: g (thanh mẫu)");
    expect(speakMock).toHaveBeenCalledWith("gē", { rate: 0.95 });
    speakMock.mockClear();
    act(() => getByText("Luyện riêng với âm này").click());
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(speakMock).toHaveBeenCalled(); // phát câu đầu
  });

  it("Review Focus #3: Space ở matrix không phát gì", () => {
    render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    const calls = speakMock.mock.calls.length;
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(speakMock.mock.calls.length).toBe(calls);
  });
});

describe("PinyinLabRoot — quiz", () => {
  it("initialMode quiz: mount → quiz-view + phát câu đầu", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(speakMock).toHaveBeenCalled();
  });

  it("initialDrill: vào thẳng quiz (pool lọc — assert qua UI không crash + 4 option)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill="sh" />);
    expect(document.querySelectorAll("[data-opt]").length).toBe(4);
  });

  it("trả lời → feedback; Enter sang câu 2 (Review Focus #2: trả lời 2 lần no-op)", () => {
    const { container } = render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Chính xác!|Chưa đúng\./);
    expect(document.body.textContent).toMatch(/Độ chính xác: \d+%/);
    const q1 = document.body.textContent!.match(/Câu (\d+) \/ 10/)![1];
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true })); }); // đã picked → no-op
    expect(document.body.textContent!.match(/Câu (\d+) \/ 10/)![1]).toBe(q1);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Câu 2 \/ 10/);
  });

  it("Space phát lại khi chưa trả lời (quiz mode)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    const calls = speakMock.mock.calls.length;
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(speakMock.mock.calls.length).toBe(calls + 1);
  });

  it("reset × → phiên mới + toast copy mock", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    // toastProvider không có trong mount đơn lẻ → useToastSafe no-op; chỉ assert không crash + quiz vẫn hiện
    act(() => (document.querySelector('[aria-label="Chơi lại phiên mới"]') as HTMLElement).click());
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(document.querySelectorAll("[data-opt]").length).toBe(4);
  });

  it("10 câu → tổng kết + XP/best đúng 1 lần (Review Focus #5)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    for (let q = 0; q < 9; q++) {
      act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); });
      act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    }
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); }); // câu 10 → done
    expect(document.body.textContent).toContain("Hoàn thành phiên!");
    expect(progressStore.addXp).toHaveBeenCalledTimes(1);
    expect(progressStore.recordPinyinLabResult).toHaveBeenCalledTimes(1);
    // Enter sau done → phiên mới (mock startQuiz)
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Câu 1 \/ 10/);
  });
});
