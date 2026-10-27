// src/components/shadowing/studio/__tests__/audio-engine.test.ts
/* T7 — chế độ audio của usePlayerEngine: audioSrcs tồn tại → engine điều khiển
   element #audioplayer thay vì postMessage YouTube. API state giữ nguyên. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayerEngine } from "../use-player-engine";
import type { SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));

const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "你好" }], pinyin: "Nǐ hǎo", vi: "Xin chào" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
  { n: 3, start: 16, end: 24, parts: [{ zh: "谢谢" }], pinyin: "Xièxie", vi: "Cảm ơn" },
];

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;

function mountAudio(): HTMLAudioElement {
  const el = document.createElement("audio");
  el.id = "audioplayer";
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  // jsdom: play() chưa implement — spy trả undefined (không reject)
  playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => undefined as never);
  pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  document.getElementById("audioplayer")?.remove();
  vi.restoreAllMocks();
});

describe("usePlayerEngine — chế độ audio (audioSrcs)", () => {
  it("play/pause điều khiển #audioplayer, KHÔNG postMessage YouTube", () => {
    const postSink = vi.fn();
    const audio = mountAudio();
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink, playerRef: { current: null }, audioSrcs: ["a-1.mp3", "a-2.mp3", "a-3.mp3"] }));
    act(() => result.current.play());
    expect(playSpy).toHaveBeenCalled();
    expect(postSink).not.toHaveBeenCalled();
    act(() => result.current.pause());
    expect(pauseSpy).toHaveBeenCalled();
    expect(audio.paused).toBe(true);
  });

  it("gotoSentence đặt currentTime = subs[i].start; setRate → playbackRate", () => {
    const audio = mountAudio();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: null }, audioSrcs: ["a-1.mp3", "a-2.mp3", "a-3.mp3"] }));
    act(() => result.current.gotoSentence(1, false));
    expect(result.current.cur).toBe(1);
    expect(audio.currentTime).toBe(subs[1].start);
    act(() => result.current.setRate(0.75));
    expect(audio.playbackRate).toBe(0.75);
  });

  it("onended của clip → tự chuyển câu tiếp; hết danh sách → pause", () => {
    mountAudio();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: null }, audioSrcs: ["a-1.mp3", "a-2.mp3", "a-3.mp3"] }));
    act(() => { result.current.play(); });
    const audio = document.getElementById("audioplayer") as HTMLAudioElement;
    act(() => { audio.dispatchEvent(new Event("ended")); });
    expect(result.current.cur).toBe(1);
    expect(result.current.playing).toBe(true);
    // hết câu cuối
    act(() => result.current.gotoSentence(2, true));
    act(() => { audio.dispatchEvent(new Event("ended")); });
    expect(result.current.cur).toBe(2);
    expect(result.current.playing).toBe(false);
  });

  it("loop bật → onended quay lại đầu câu thay vì sang câu mới", () => {
    mountAudio();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: null }, audioSrcs: ["a-1.mp3", "a-2.mp3", "a-3.mp3"] }));
    act(() => { result.current.play(); result.current.toggleLoop(); });
    const audio = document.getElementById("audioplayer") as HTMLAudioElement;
    act(() => { audio.dispatchEvent(new Event("ended")); });
    expect(result.current.cur).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it("speakSentence(i) ở chế độ audio → phát clip câu i thay vì TTS", () => {
    mountAudio();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: null }, audioSrcs: ["a-1.mp3", "a-2.mp3", "a-3.mp3"] }));
    act(() => result.current.speakSentence(2));
    expect(result.current.cur).toBe(2);
    expect(playSpy).toHaveBeenCalled();
  });

  it("TTS fallback 4s KHÔNG kích hoạt ở chế độ audio", () => {
    vi.useFakeTimers();
    try {
      mountAudio();
      const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: null }, audioSrcs: ["a-1.mp3"] }));
      act(() => vi.advanceTimersByTime(4100));
      expect(result.current.tts).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("usePlayerEngine — không có audioSrcs: path YouTube qua media ref", () => {
  it("gotoSentence gán currentTime = start câu lên ref; postSink không còn dùng", () => {
    const postSink = vi.fn();
    const media = {
      currentTime: 0, duration: 100, playbackRate: 1,
      play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(),
    } as unknown as HTMLMediaElement & { play: ReturnType<typeof vi.fn> };
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink, playerRef: { current: media } }));
    act(() => result.current.gotoSentence(1, false));
    expect(media.currentTime).toBe(subs[1].start);
    expect(postSink).not.toHaveBeenCalled();
    expect(result.current.cur).toBe(1);
  });
});
