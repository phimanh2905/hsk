// src/components/shadowing/studio/__tests__/use-player-engine.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { findSentenceIndex, usePlayerEngine } from "../use-player-engine";
import type { SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));

const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "你好" }], pinyin: "Nǐ hǎo", vi: "Xin chào" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
];

/* fake media element theo interface HTMLMediaElement — ReactPlayer v3 expose
   chính interface này qua ref (youtube-video-element extends HTMLVideoElement). */
function fakeMedia() {
  return {
    currentTime: 0,
    duration: 100,
    playbackRate: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  } as unknown as HTMLMediaElement & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };
}

describe("findSentenceIndex (di chuyển nguyên vẹn)", () => {
  it("t trong range → index; t ≥ end cuối → câu cuối; t < start đầu → 0", () => {
    expect(findSentenceIndex(subs, 5)).toBe(0);
    expect(findSentenceIndex(subs, 12)).toBe(1);
    expect(findSentenceIndex(subs, 100)).toBe(1);
    expect(findSentenceIndex(subs, -1)).toBe(0);
  });
});

describe("usePlayerEngine (ref-driven)", () => {
  it("seek: gotoSentence gán currentTime = start của câu", () => {
    const media = fakeMedia();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: media } }));
    act(() => result.current.gotoSentence(1, false));
    expect(media.currentTime).toBe(subs[1].start);
    expect(result.current.cur).toBe(1);
  });

  it("play/pause điều khiển media element qua ref", () => {
    const media = fakeMedia();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: media } }));
    act(() => result.current.play());
    expect(media.play).toHaveBeenCalled();
    expect(result.current.playing).toBe(true);
    act(() => result.current.pause());
    expect(media.pause).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
  });

  it("setRate gán playbackRate lên media element", () => {
    const media = fakeMedia();
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: media } }));
    act(() => result.current.setRate(0.85));
    expect(media.playbackRate).toBe(0.85);
    expect(result.current.rate).toBe(0.85);
  });

  it("markYtReady tắt overlay; handlePlayerError bật playerError", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }));
    expect(result.current.playerError).toBe(false);
    act(() => result.current.handlePlayerError());
    expect(result.current.playerError).toBe(true);
    act(() => result.current.markYtReady());
    expect(result.current.ytReady).toBe(true);
  });

  it("syncPlaying cập nhật playing khi YouTube tự pause (không đổi ở audio/tts mode)", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }));
    act(() => result.current.syncPlaying(true)); // YT báo đang phát
    expect(result.current.playing).toBe(true);
    act(() => result.current.syncPlaying(false)); // YT tự pause (buffer)
    expect(result.current.playing).toBe(false);
  });

  it("next/prev/repeat clamp trong [0, len-1]", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }));
    act(() => result.current.prev());
    expect(result.current.cur).toBe(0);
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.cur).toBe(1);
    act(() => result.current.repeat());
    expect(result.current.cur).toBe(1);
  });

  it("toggleLoop đổi loop", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }));
    expect(result.current.loop).toBe(false);
    act(() => result.current.toggleLoop());
    expect(result.current.loop).toBe(true);
  });

  /* Task 5 — time state + auto-pause toggle. Poll 100ms đọc currentTime trực tiếp
     từ ref (bỏ postMessage); markYtReady() thay message "onReady". */
  const subsWords: SubtitleSentence[] = [
    {
      n: 1, start: 0, end: 2, parts: [{ zh: "我们" }], pinyin: "", vi: "",
      words: [
        { zh: "我", py: "", startMs: 0, endMs: 1200 },
        { zh: "们", py: "", startMs: 1200, endMs: 1800 },
      ],
    },
    { n: 2, start: 3, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
  ];

  it("tick cập nhật time từ ref", () => {
    vi.useFakeTimers();
    try {
      const media = fakeMedia();
      const { result } = renderHook(() => usePlayerEngine({ subs: subsWords, playerRef: { current: media } }));
      expect(result.current.time).toBe(0);
      act(() => result.current.markYtReady());
      act(() => { media.currentTime = 5; });
      act(() => vi.advanceTimersByTime(150)); // qua 1 nhịp poll 100ms
      expect(result.current.time).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("setAutoPause flip state + localStorage", () => {
    localStorage.clear();
    const { result } = renderHook(() => usePlayerEngine({ subs: subsWords, playerRef: { current: fakeMedia() } }));
    expect(result.current.autoPause).toBe(false);
    act(() => result.current.setAutoPause(true));
    expect(result.current.autoPause).toBe(true);
    expect(localStorage.getItem("bye.shadowing.autoPause")).toBe("1");
  });

  /* auto-pause theo word timing: t chạm endMs từ cuối (1800ms) → dừng.
     loop BẬT → phải seek về đầu câu thay vì pause (ưu tiên loop). */
  it("auto-pause: loop TẮT → pause; loop BẬT → seek về đầu câu (không pause)", () => {
    localStorage.clear();
    vi.useFakeTimers();
    try {
      const media = fakeMedia();
      const { result } = renderHook(() => usePlayerEngine({ subs: subsWords, playerRef: { current: media } }));
      act(() => result.current.setAutoPause(true));
      act(() => result.current.markYtReady());
      // playing + currentTime 1.9s (> endMs từ cuối 1800ms - 60ms)
      act(() => result.current.play());
      act(() => { media.currentTime = 1.9; });
      expect(result.current.playing).toBe(true);

      /* ---- loop TẮT → auto-pause dừng media ---- */
      act(() => vi.advanceTimersByTime(150)); // qua 1 nhịp poll 100ms
      expect(media.pause).toHaveBeenCalled();
      expect(result.current.playing).toBe(false);

      /* ---- loop BẬT → seek về đầu câu, KHÔNG pause ---- */
      act(() => result.current.toggleLoop());
      expect(result.current.loop).toBe(true);
      act(() => result.current.play());
      media.pause.mockClear();
      act(() => { media.currentTime = 1.9; });
      act(() => vi.advanceTimersByTime(150));
      expect(media.currentTime).toBe(0); // về đầu câu 0
      expect(media.pause).not.toHaveBeenCalled();
      expect(result.current.playing).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
