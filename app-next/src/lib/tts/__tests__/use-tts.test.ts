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
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
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
    speaking: false,
    pending: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

const synth = () => window.speechSynthesis as unknown as Record<string, ReturnType<typeof vi.fn>>;
const setSpeaking = (v: { speaking?: boolean; pending?: boolean }) => {
  (window.speechSynthesis as unknown as { speaking: boolean; pending: boolean }).speaking = !!v.speaking;
  (window.speechSynthesis as unknown as { speaking: boolean; pending: boolean }).pending = !!v.pending;
};

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

  describe("voice preference bye.voice", () => {
    const setVoices = (voices: object[]) => {
      (window.speechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockReturnValue(voices);
    };
    const pickedName = () =>
      (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0].voice?.name;

    afterEach(() => {
      localStorage.removeItem("bye.voice");
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
      localStorage.setItem("bye.voice", "male");
      setVoices([
        { name: "Tingting", lang: "zh-CN" },
        { name: "Male-ZH", lang: "zh-CN" },
      ]);
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(pickedName()).toBe("Male-ZH");
    });
    it("không có voice khớp pref -> fallback voice zh đầu tiên", () => {
      localStorage.setItem("bye.voice", "male");
      setVoices([{ name: "Tingting", lang: "zh-CN" }]);
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(pickedName()).toBe("Tingting");
    });
  });

  // iOS Safari nuốt utterance khi cancel() gọi liền speak() trong cùng một tick,
  // và setTimeout không còn user gesture nên retry kiểu cũ vô dụng. Xem use-tts.ts.
  describe("cancel có điều kiện (tránh nuốt utterance trên iOS)", () => {
    it("không gọi cancel() khi không có gì đang phát", () => {
      setSpeaking({ speaking: false, pending: false });
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(window.speechSynthesis.cancel).not.toHaveBeenCalled();
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it("gọi cancel() khi đang có câu đang phát", () => {
      setSpeaking({ speaking: true, pending: false });
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });

    it("gọi cancel() khi có câu đang xếp hàng (pending)", () => {
      setSpeaking({ speaking: false, pending: true });
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe("không retry bằng setTimeout (mất user gesture trên iOS)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("sau 15s không tự phát lại — user bấm lại mới phát", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it("bấm 🔊 lần hai vẫn phát lại được (trong gesture của lần bấm)", () => {
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      act(() => result.current.speak("你好"));
      expect(chunkTexts()).toEqual(["你好", "你好"]);
    });
  });

  describe("onerror", () => {
    it("utterance lỗi thì thoát trạng thái speaking", () => {
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(result.current.speaking).toBe(true);
      const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
      act(() => {
        u.onerror?.(new Event("error"));
      });
      expect(result.current.speaking).toBe(false);
    });

    it("onend sau onend không nổ", () => {
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
      act(() => {
        u.onerror?.(new Event("error"));
        u.onend?.();
      });
      expect(result.current.speaking).toBe(false);
    });
  });

  describe("nạp voice lười (voiceschanged)", () => {
    it("đăng ký listener voiceschanged khi mount", () => {
      renderHook(() => useTts());
      expect(synth().addEventListener).toHaveBeenCalledWith(
        "voiceschanged",
        expect.any(Function)
      );
    });

    it("bỏ listener khi unmount", () => {
      const { unmount } = renderHook(() => useTts());
      unmount();
      expect(synth().removeEventListener).toHaveBeenCalledWith(
        "voiceschanged",
        expect.any(Function)
      );
    });

    it("sau voiceschanged thì chọn voice mới (trước đó getVoices trả về rỗng)", () => {
      // mockImplementation để đọc biến `voices` tại thời điểm gọi
      let voices: object[] = [];
      (window.speechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockImplementation(
        () => voices
      );
      const { result } = renderHook(() => useTts());

      // chưa có voice zh nào -> không set voice, vẫn phát được
      act(() => result.current.speak("你好"));
      expect(
        (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0].voice
      ).toBeNull();

      // Safari báo danh sách voice đã sẵn sàng
      voices = [{ name: "Tingting", lang: "zh-CN" }];
      const handler = synth().addEventListener.mock.calls.find(
        (c) => c[0] === "voiceschanged"
      )?.[1] as () => void;
      act(() => {
        handler?.();
      });

      act(() => result.current.speak("你好"));
      expect(
        (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[1][0].voice?.name
      ).toBe("Tingting");
    });

    it("getVoices() rỗng lúc bấm nhưng cache đã có voice -> vẫn chọn được voice", () => {
      let voices: object[] = [{ name: "Tingting", lang: "zh-CN" }];
      (window.speechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockImplementation(
        () => voices
      );
      const { result } = renderHook(() => useTts());
      const handler = synth().addEventListener.mock.calls.find(
        (c) => c[0] === "voiceschanged"
      )?.[1] as () => void;
      act(() => {
        handler?.();
      });

      // Safari trả về rỗng (đã biết: có lúc getVoices() không đồng bộ với voiceschanged)
      voices = [];
      act(() => result.current.speak("你好"));
      expect(
        (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0].voice?.name
      ).toBe("Tingting");
    });

    // jsdom và một số môi trường test stub speechSynthesis thiếu addEventListener
    it("không vỡ khi speechSynthesis thiếu addEventListener", () => {
      delete synth().addEventListener;
      delete synth().removeEventListener;
      const { result } = renderHook(() => useTts());
      expect(() => act(() => result.current.speak("你好"))).not.toThrow();
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it("không vỡ khi speechSynthesis thiếu speaking/pending", () => {
      const s = window.speechSynthesis as unknown as Record<string, unknown>;
      delete s.speaking;
      delete s.pending;
      const { result } = renderHook(() => useTts());
      expect(() => act(() => result.current.speak("你好"))).not.toThrow();
      expect((window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });
  });
});
