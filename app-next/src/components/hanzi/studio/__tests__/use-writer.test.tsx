import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWriter } from "../use-writer";
import { loadWriterCharData } from "../writer-data";

vi.mock("hanzi-writer", () => {
  const create = vi.fn((_el: any, char: string, opts: any) => ({
    char,
    opts,
    target: { innerHTML: "" },
    animateCharacter: vi.fn(),
    animateStroke: vi.fn(),
    showCharacter: vi.fn(),
    hideCharacter: vi.fn(),
    showOutline: vi.fn(),
    hideOutline: vi.fn(),
    updateColor: vi.fn(),
    quiz: vi.fn(),
    cancelQuiz: vi.fn(),
    setCharacter: vi.fn(() => Promise.resolve()),
  }));
  return { default: { create } };
});
vi.mock("../writer-data", () => ({
  loadWriterCharData: vi.fn(),
  clearWriterDataCache: vi.fn(),
}));

import HanziWriter from "hanzi-writer";

const DATA = { strokes: ["M1", "M2", "M3"], medians: [[[0, 0]]] };

function setup() {
  const ref = { current: document.createElement("div") };
  const { result } = renderHook(() => useWriter(ref as any));
  return { result, ref };
}

function lastInstance() {
  const calls = (HanziWriter.create as any).mock.results;
  return calls[calls.length - 1].value;
}

beforeEach(() => {
  vi.mocked(loadWriterCharData).mockReset();
  (HanziWriter.create as any).mockClear();
});

describe("useWriter", () => {
  it("load: chỉ nạp data vào ref, KHÔNG create writer", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    let ok = false;
    await act(async () => { ok = await result.current.load("口"); });
    expect(ok).toBe(true);
    expect(HanziWriter.create).not.toHaveBeenCalled();
  });

  it("startQuiz lần đầu: create 1 lần với showCharacter:false, showOutline:false", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    expect(HanziWriter.create).toHaveBeenCalledTimes(1);
    const opts = (HanziWriter.create as any).mock.calls[0][2];
    expect(opts.showCharacter).toBe(false);
    expect(opts.showOutline).toBe(false);
    expect(opts.charDataLoader()).toBe(DATA);
  });

  it("startQuiz lần 2 (cùng chữ): không create lại", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    result.current.startQuiz();
    expect(HanziWriter.create).toHaveBeenCalledTimes(1);
  });

  it("quiz passthrough + onComplete", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    const onComplete = vi.fn();
    result.current.startQuiz(onComplete);
    expect(inst.quiz).toHaveBeenCalledWith({ onComplete });
  });

  it("cancelQuiz passthrough", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    result.current.cancelQuiz();
    expect(inst.cancelQuiz).toHaveBeenCalledTimes(1);
  });

  it("showOutline true/false → showOutline/hideOutline; instant → duration 0", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    result.current.showOutline(true);
    expect(inst.showOutline).toHaveBeenCalledWith({ duration: undefined });
    result.current.showOutline(true, { instant: true });
    expect(inst.showOutline).toHaveBeenCalledWith({ duration: 0 });
    result.current.showOutline(false);
    expect(inst.hideOutline).toHaveBeenCalledWith({ duration: undefined });
    result.current.showOutline(false, { instant: true });
    expect(inst.hideOutline).toHaveBeenCalledWith({ duration: 0 });
  });

  it("load không có data → startQuiz no-op", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(null);
    const { result } = setup();
    let ok = true;
    await act(async () => { ok = await result.current.load("龤"); });
    expect(ok).toBe(false);
    result.current.startQuiz();
    expect(HanziWriter.create).not.toHaveBeenCalled();
  });

  it("đổi chữ: quiz chỉ chạy SAU KHI setCharacter resolve", async () => {
    vi.mocked(loadWriterCharData)
      .mockResolvedValueOnce(DATA)
      .mockResolvedValueOnce(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    const quizCountAfterFirst = inst.quiz.mock.calls.length; // 1 (từ lần startQuiz đầu)
    let resolveSwap: () => void;
    inst.setCharacter.mockReturnValue(new Promise<void>((r) => { resolveSwap = r; }));
    await act(async () => { await result.current.load("人"); });
    const onComplete = vi.fn();
    result.current.startQuiz(onComplete);
    expect(inst.setCharacter).toHaveBeenCalledWith("人");
    expect(inst.quiz.mock.calls.length).toBe(quizCountAfterFirst); // chưa swap xong → chưa quiz
    await act(async () => { resolveSwap!(); });
    expect(inst.quiz).toHaveBeenCalledWith({ onComplete });
  });

  it("setCharacter fail → reset createdChar, startQuiz sau thử swap lại", async () => {
    vi.mocked(loadWriterCharData)
      .mockResolvedValueOnce(DATA)
      .mockResolvedValueOnce(DATA)
      .mockResolvedValueOnce(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    const quizCountAfterFirst = inst.quiz.mock.calls.length;
    inst.setCharacter.mockRejectedValueOnce(new Error("swap fail"));
    await act(async () => { await result.current.load("人"); });
    result.current.startQuiz();
    await act(async () => {}); // flush rejection
    expect(inst.setCharacter).toHaveBeenCalledTimes(1);
    expect(inst.quiz.mock.calls.length).toBe(quizCountAfterFirst); // swap fail → không quiz
    result.current.startQuiz(); // startQuiz sau → thử swap lại
    await act(async () => {});
    expect(inst.setCharacter).toHaveBeenCalledTimes(2);
  });

  it("swap A→B→A: setCharacter mỗi lần đổi chữ, quiz 3 lần đúng thứ tự", async () => {
    vi.mocked(loadWriterCharData)
      .mockResolvedValueOnce(DATA) // 口
      .mockResolvedValueOnce(DATA) // 人
      .mockResolvedValueOnce(DATA); // 口
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    expect(inst.setCharacter).not.toHaveBeenCalled();
    await act(async () => { await result.current.load("人"); });
    result.current.startQuiz();
    await act(async () => {});
    expect(inst.setCharacter).toHaveBeenCalledTimes(1);
    expect(inst.setCharacter).toHaveBeenCalledWith("人");
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    await act(async () => {});
    expect(inst.setCharacter).toHaveBeenCalledTimes(2); // B→A phải swap lại, không skip
    expect(inst.setCharacter).toHaveBeenLastCalledWith("口");
    expect(inst.quiz).toHaveBeenCalledTimes(3);
  });

  it("startQuiz lặp cùng chữ sau swap: không setCharacter lại", async () => {
    vi.mocked(loadWriterCharData)
      .mockResolvedValueOnce(DATA)
      .mockResolvedValueOnce(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    await act(async () => { await result.current.load("人"); });
    result.current.startQuiz();
    await act(async () => {});
    result.current.startQuiz(); // cùng chữ 人 → không swap lại
    await act(async () => {});
    expect(inst.setCharacter).toHaveBeenCalledTimes(1);
    expect(inst.quiz).toHaveBeenCalledTimes(3); // create-path + post-swap + repeat
  });

  it("reset: cancelQuiz + drop instance — startQuiz sau đó create lại", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = renderHook(() =>
      useWriter({ current: document.createElement("div") } as any),
    );
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    act(() => { result.current.reset(); });
    expect(inst.cancelQuiz).toHaveBeenCalledTimes(1);
    // data đã bị xoá — load lại rồi startQuiz sẽ create instance MỚI
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    expect(HanziWriter.create).toHaveBeenCalledTimes(2);
    expect(lastInstance()).not.toBe(inst);
  });

  it("unmount: cancelQuiz + drop instance", async () => {    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result, unmount } = renderHook(() =>
      useWriter({ current: document.createElement("div") } as any),
    );
    await act(async () => { await result.current.load("口"); });
    result.current.startQuiz();
    const inst = lastInstance();
    unmount();
    expect(inst.cancelQuiz).toHaveBeenCalledTimes(1);
    // instance đã drop: startQuiz sau unmount không đụng instance cũ
    result.current.startQuiz();
    expect(inst.quiz).toHaveBeenCalledTimes(1); // không tăng
  });
});
