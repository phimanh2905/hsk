import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
      voice: SpeechSynthesisVoice | null = null;
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

  describe("voice preference nhai.voice", () => {
    const setVoices = (voices: object[]) => {
      (window.speechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockReturnValue(voices);
    };
    const pickedName = () =>
      (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0].voice?.name;

    afterEach(() => {
      localStorage.removeItem("nhai.voice");
      vi.restoreAllMocks();
    });

    it("female (mặc định) -> ưu tiên voice khớp /female|mei|tingting|hui/i", () => {
      setVoices([
        { name: "Male-ZH", lang: "zh-CN" },
        { name: "Tingting", lang: "zh-CN" },
      ]);
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(pickedName()).toBe("Tingting");
    });
    it("male -> ưu tiên voice khớp /male|daniel|tington/i", () => {
      localStorage.setItem("nhai.voice", "male");
      setVoices([
        { name: "Tingting", lang: "zh-CN" },
        { name: "Male-ZH", lang: "zh-CN" },
      ]);
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(pickedName()).toBe("Male-ZH");
    });
    it("không có voice khớp pref -> fallback voice zh đầu tiên", () => {
      localStorage.setItem("nhai.voice", "male");
      setVoices([{ name: "Tingting", lang: "zh-CN" }]);
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(pickedName()).toBe("Tingting");
    });
  });

  describe("Safari retry", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("sau 15s vẫn speaking mà synthesis không speaking -> re-speak", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      const callsAfterSpeak = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock
        .calls.length;
      expect(callsAfterSpeak).toBe(1);
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      // speakingRef=true (chưa onend) và speechSynthesis.speaking=false -> retry fire
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    });

    it("không re-speak sau khi utterance kết thúc (onend)", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
      act(() => {
        u.onend?.();
      });
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });
  });
});
