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
});
