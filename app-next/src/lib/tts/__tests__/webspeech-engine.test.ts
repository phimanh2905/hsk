import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWebspeechEngine, chunkText } from "../webspeech-engine";

const utterances = () =>
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

afterEach(() => {
  localStorage.removeItem("bye.voice");
  vi.unstubAllGlobals();
});

describe("chunkText", () => {
  it("câu ngắn -> 1 chunk", () => {
    expect(chunkText("你好")).toEqual(["你好"]);
  });
  it("cắt tại dấu 。/， gần 200 nhất, không vượt 200", () => {
    const text = "好".repeat(150) + "。" + "你".repeat(150);
    const chunks = chunkText(text);
    expect(chunks.length).toBe(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });
});

describe("createWebspeechEngine", () => {
  it("speak -> phát utterance, báo speaking=true; onend -> false + onEnd callback", () => {
    const changes: boolean[] = [];
    const onEnd = vi.fn();
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好", { onEnd });
    expect(changes).toEqual([true]);
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    u.onend?.();
    expect(changes).toEqual([true, false]);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("voice female mặc định -> Tingting; male -> Male-ZH", () => {
    const engine = createWebspeechEngine(() => {});
    engine.speak("你好");
    const picked = () =>
      (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0].voice?.name;
    expect(picked()).toBe("Tingting");
    localStorage.setItem("bye.voice", "male");
    engine.speak("再见");
    expect(picked()).toBe("Male-ZH");
  });

  it("cancel -> speechSynthesis.cancel + báo speaking=false", () => {
    const changes: boolean[] = [];
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好");
    engine.cancel();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(changes.at(-1)).toBe(false);
  });

  it("đang phát (synth.speaking) mà speak -> cancel trước khi phát", () => {
    (window.speechSynthesis as unknown as { speaking: boolean }).speaking = true;
    const engine = createWebspeechEngine(() => {});
    engine.speak("你好");
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(utterances()).toEqual(["你好"]);
  });

  it("câu dài -> nhiều utterance, chỉ chunk cuối gắn onend", () => {
    const onEnd = vi.fn();
    const engine = createWebspeechEngine(() => {});
    engine.speak("好".repeat(450), { onEnd });
    const calls = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect((calls[0][0] as SpeechSynthesisUtterance).onend).toBeNull();
    expect((calls.at(-1)![0] as SpeechSynthesisUtterance).onend).not.toBeNull();
  });

  it("onerror cũng kết thúc (báo false + onEnd)", () => {
    const changes: boolean[] = [];
    const onEnd = vi.fn();
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好", { onEnd });
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    u.onerror?.(new Event("error"));
    expect(changes.at(-1)).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("dispose -> gỡ listener voiceschanged + cancel", () => {
    const engine = createWebspeechEngine(() => {});
    engine.dispose();
    expect(synthSynth().removeEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      expect.any(Function)
    );
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

const synthSynth = () =>
  window.speechSynthesis as unknown as Record<string, ReturnType<typeof vi.fn>>;
