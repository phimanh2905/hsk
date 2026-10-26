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

describe("findSentenceIndex (di chuyển nguyên vẹn)", () => {
  it("t trong range → index; t ≥ end cuối → câu cuối; t < start đầu → 0", () => {
    expect(findSentenceIndex(subs, 5)).toBe(0);
    expect(findSentenceIndex(subs, 12)).toBe(1);
    expect(findSentenceIndex(subs, 100)).toBe(1);
    expect(findSentenceIndex(subs, -1)).toBe(0);
  });
});

describe("usePlayerEngine", () => {
  it("postSink nhận seekTo khi gotoSentence", () => {
    const postSink = vi.fn();
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink }));
    act(() => result.current.gotoSentence(1, false));
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"seekTo"'));
    expect(result.current.cur).toBe(1);
  });
  it("next/prev/repeat clamp trong [0, len-1]", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs }));
    act(() => result.current.prev());
    expect(result.current.cur).toBe(0);
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.cur).toBe(1);
    act(() => result.current.repeat());
    expect(result.current.cur).toBe(1);
  });
  it("setRate đẩy setPlaybackRate vào iframe", () => {
    const postSink = vi.fn();
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink }));
    act(() => result.current.setRate(0.85));
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"setPlaybackRate"'));
    expect(result.current.rate).toBe(0.85);
  });
  it("toggleLoop đổi loop", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs }));
    expect(result.current.loop).toBe(false);
    act(() => result.current.toggleLoop());
    expect(result.current.loop).toBe(true);
  });

  /* Task 5 — time state + auto-pause toggle. Poll 100ms; ytReady phải đánh thức
     qua message "onReady" (như handshake thật) để nhịp poll đi tới tick(). */
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

  function ytMessage(data: unknown) {
    window.dispatchEvent(
      new MessageEvent("message", { origin: "https://www.youtube-nocookie.com", data: JSON.stringify(data) })
    );
  }

  it("tick cập nhật time", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePlayerEngine({ subs: subsWords }));
      expect(result.current.time).toBe(0);
      act(() => ytMessage({ event: "onReady" }));
      act(() => ytMessage({ event: "infoDelivery", infoDelivery: { playerData: { currentTime: 5, playerState: 1 } } }));
      act(() => vi.advanceTimersByTime(150)); // qua 1 nhịp poll 100ms
      expect(result.current.time).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("setAutoPause flip state + localStorage", () => {
    localStorage.clear();
    const { result } = renderHook(() => usePlayerEngine({ subs: subsWords }));
    expect(result.current.autoPause).toBe(false);
    act(() => result.current.setAutoPause(true));
    expect(result.current.autoPause).toBe(true);
    expect(localStorage.getItem("bye.shadowing.autoPause")).toBe("1");
  });
});
