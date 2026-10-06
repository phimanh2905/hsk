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
    setCharacter: vi.fn(),
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
});
