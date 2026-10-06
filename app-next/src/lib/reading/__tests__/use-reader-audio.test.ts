import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useReaderAudio } from "../use-reader-audio";
import type { ReadingWord } from "@/content/reading";

const w = (z: string): ReadingWord => ({ z, p: z, h: z, m: z });
const sentences = [[w("茶"), w("道")], [w("很"), w("美")], [w("学"), w("中文")]];

type MockUtterance = {
  text: string;
  lang: string;
  rate: number;
  onend: (() => void) | null;
};

describe("useReaderAudio", () => {
  let spoken: MockUtterance[];
  let realSynth: unknown;

  beforeEach(() => {
    spoken = [];
    realSynth = window.speechSynthesis;
    // Stub Utterance nhận text qua constructor (stub của vitest.setup bỏ qua arg)
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      class {
        text: string;
        lang = "";
        rate = 1;
        onend: (() => void) | null = null;
        constructor(text?: string) {
          this.text = text ?? "";
        }
      };
    const mockSynth = {
      cancel: vi.fn(),
      speak: vi.fn((u: MockUtterance) => spoken.push(u)),
    };
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = mockSynth;
  });

  afterEach(() => {
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = realSynth;
  });

  it("play(0) → phát câu 0, playing=true; onend → tự sang câu 1", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(0));
    expect(result.current.playing).toBe(true);
    expect(result.current.index).toBe(0);
    expect(spoken.length).toBe(1);
    expect(spoken[0].text).toBe("茶道");

    act(() => spoken[0].onend?.());
    expect(result.current.index).toBe(1);
    expect(result.current.playing).toBe(true);
    expect(spoken.length).toBe(2);
    expect(spoken[1].text).toBe("很美");
  });

  it("hết câu cuối → playing=false", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(2));
    act(() => spoken[0].onend?.());
    expect(result.current.index).toBe(2);
    expect(result.current.playing).toBe(false);
    expect(spoken.length).toBe(1); // không phát thêm
  });

  it("pause → playing=false + cancel, onend muộn không nhảy câu", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(0));
    act(() => result.current.pause());
    expect(result.current.playing).toBe(false);
    const onend = spoken[0].onend;
    act(() => onend?.());
    expect(result.current.index).toBe(0); // không tiến câu
  });

  it("seek khi đang phát → phát lại từ câu được chọn", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(0));
    act(() => result.current.seek(2));
    expect(result.current.index).toBe(2);
    expect(spoken[1].text).toBe("学中文");
  });

  it("setRate giữa chừng → lưu rate, restart câu hiện tại với rate mới", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(1));
    act(() => result.current.setRate(1.25));
    expect(result.current.rate).toBe(1.25);
    expect(spoken.length).toBe(2); // câu 1 phát lại
    expect(spoken[1].rate).toBe(1.25);
  });

  it("play() không tham số tiếp từ index hiện tại", () => {
    const { result } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(1));
    act(() => result.current.pause());
    act(() => result.current.play());
    expect(result.current.index).toBe(1);
  });

  it("không có speechSynthesis → mọi action no-op, không crash", () => {
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = undefined;
    const { result } = renderHook(() => useReaderAudio(sentences));
    expect(() => {
      act(() => result.current.play(0));
      act(() => result.current.seek(2));
      act(() => result.current.setRate(0.75));
      act(() => result.current.pause());
    }).not.toThrow();
  });

  it("unmount → cancel", () => {
    const { result, unmount } = renderHook(() => useReaderAudio(sentences));
    act(() => result.current.play(0));
    const synth = window.speechSynthesis as unknown as { cancel: ReturnType<typeof vi.fn> };
    unmount();
    expect(synth.cancel).toHaveBeenCalled();
  });
});
