import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWriter } from "../use-writer";
import { loadWriterCharData } from "../writer-data";

vi.mock("hanzi-writer", () => {
  const instances: any[] = [];
  const create = vi.fn((_el: any, char: string, opts: any) => {
    const w = {
      char,
      opts,
      target: { innerHTML: "" },
      animateCharacter: vi.fn(),
      animateStroke: vi.fn(),
      setState: vi.fn(),
      quiz: vi.fn(),
      pauseQuiz: vi.fn(),
      setSpeed: vi.fn(), // lib thật không có setSpeed — speed qua opts lúc create; mock để bắt
      showOutline: opts?.showOutline,
      _setColor: opts?.strokeColor,
    };
    instances.push(w);
    return w;
  });
  return { default: { create }, __instances: instances };
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

beforeEach(() => {
  vi.mocked(loadWriterCharData).mockReset();
  (HanziWriter.create as any).mockClear();
});

describe("useWriter", () => {
  it("load: tạo writer 1 lần cho cùng chữ, trả true", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    let ok = false;
    await act(async () => { ok = await result.current.load("口"); });
    expect(ok).toBe(true);
    expect(HanziWriter.create).toHaveBeenCalledTimes(1);
    await act(async () => { ok = await result.current.load("口"); });
    expect(ok).toBe(true);
    expect(HanziWriter.create).toHaveBeenCalledTimes(1); // cùng chữ không tạo lại
  });

  it("load chữ không có data → false, không create", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(null);
    const { result } = setup();
    let ok = true;
    await act(async () => { ok = await result.current.load("龤"); });
    expect(ok).toBe(false);
    expect(HanziWriter.create).not.toHaveBeenCalled();
  });

  it("playAll/animateStroke/showStrokes/setState ủy quyền đúng", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    result.current.playAll();
    expect(inst.animateCharacter).toHaveBeenCalled();
    result.current.animateStroke(2);
    expect(inst.animateStroke).toHaveBeenCalledWith(2);
    act(() => result.current.showStrokes(2));
    expect(inst.setState).toHaveBeenCalledWith({ character: { strokes: [1, 1, 0] } });
  });

  it("showStrokes >= tổng nét → toàn bộ 1", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    act(() => result.current.showStrokes(99));
    expect(inst.setState).toHaveBeenCalledWith({ character: { strokes: [1, 1, 1] } });
  });

  it("startQuiz/stopQuiz gọi quiz/pauseQuiz; setSpeed đổi opts speed", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    result.current.startQuiz();
    expect(inst.quiz).toHaveBeenCalled();
    result.current.stopQuiz();
    expect(inst.pauseQuiz).toHaveBeenCalled();
    act(() => result.current.setSpeed(0.75));
    // speed là opts lúc animate — kiểm qua animateCharacter được gọi với options mới
    result.current.playAll();
    expect(inst.animateCharacter).toHaveBeenCalledWith(expect.objectContaining({ strokeAnimationSpeed: 0.75 }));
  });

  it("setOutline toggle qua setState outline opacity", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    act(() => result.current.setOutline(true));
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 1 } }));
    act(() => result.current.setOutline(false));
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 0 } }));
  });
});
