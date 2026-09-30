import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTts } from "../use-tts";

const chunkTexts = () =>
  (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => (c[0] as SpeechSynthesisUtterance).text
  );

beforeEach(() => {
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      rate = 1;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
  );
  vi.stubGlobal("speechSynthesis", {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [
      { name: "Tingting", lang: "zh-CN" },
      { name: "Male-ZH", lang: "zh-CN" },
    ]),
  });
});

describe("useTts", () => {
  it("phát 1 utterance cho câu ngắn, lang zh-CN", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak("你好"));
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(chunkTexts()[0]).toBe("你好");
  });
  it("chunk câu dài >200 ký tự thành nhiều utterance", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak("好".repeat(450)));
    expect(
      (window.speechSynthesis.speak as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThanOrEqual(3);
    for (const t of chunkTexts()) expect(t.length).toBeLessThanOrEqual(200);
  });
  it("cancel gọi speechSynthesis.cancel", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.cancel());
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
