import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStaticAudio, _resetStaticAudioForTest } from "../use-static-audio";

/* FakeAudio: ghi lại src, playbackRate, preservesPitch và đếm play/pause.
   play() trả promise resolve; onErrorProps cho phép bắn error event thủ công. */
class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  playbackRate = 1;
  preservesPitch = true;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  error: unknown = null;
  private listeners = new Map<string, (() => void)[]>();
  constructor() {
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    const arr = this.listeners.get(type) ?? [];
    arr.push(fn);
    this.listeners.set(type, arr);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn));
  }
  dispatch(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

beforeEach(() => {
  FakeAudio.instances = [];
  _resetStaticAudioForTest();
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const latest = () => FakeAudio.instances[FakeAudio.instances.length - 1];

describe("useStaticAudio", () => {
  it("play đặt src + playbackRate và gọi play", () => {
    const { result } = renderHook(() => useStaticAudio());
    act(() => result.current.play("/audio/pinyin/ma-1.mp3"));
    expect(latest().src).toBe("/audio/pinyin/ma-1.mp3");
    expect(latest().play).toHaveBeenCalledTimes(1);
  });

  it("rate < 1 đặt preservesPitch = true và playbackRate", () => {
    const { result } = renderHook(() => useStaticAudio());
    act(() => result.current.play("/audio/pinyin/ma-1.mp3", { rate: 0.65 }));
    expect(latest().playbackRate).toBe(0.65);
    expect(latest().preservesPitch).toBe(true);
  });

  it("play lần 2 dừng clip trước đó", () => {
    const { result } = renderHook(() => useStaticAudio());
    act(() => result.current.play("/audio/pinyin/ma-1.mp3"));
    const first = latest();
    act(() => result.current.play("/audio/pinyin/ma-2.mp3"));
    expect(first.pause).toHaveBeenCalled();
    expect(latest().src).toBe("/audio/pinyin/ma-2.mp3");
  });

  it("stop dừng clip hiện tại và reset currentTime", () => {
    const { result } = renderHook(() => useStaticAudio());
    act(() => result.current.play("/audio/pinyin/ma-1.mp3"));
    const a = latest();
    act(() => result.current.stop());
    expect(a.pause).toHaveBeenCalled();
    expect(a.src).toBe("");
  });

  it("play() bị từ chối (vd 404) gọi onError với url + rate", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticAudio({ onError }));
    act(() => result.current.play("/audio/pinyin/ma-1.mp3"));
    act(() => {
      (latest().play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("404"));
    });
    await act(async () => {
      result.current.play("/audio/pinyin/ma-5.mp3", { rate: 0.65 });
    });
    expect(onError).toHaveBeenCalledWith("/audio/pinyin/ma-5.mp3", 0.65);
  });

  it("sự kiện error của element gọi onError với url + rate", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticAudio({ onError }));
    act(() => result.current.play("/audio/pinyin/ma-5.mp3"));
    await act(async () => {
      latest().dispatch("error");
    });
    expect(onError).toHaveBeenCalledWith("/audio/pinyin/ma-5.mp3", 1);
  });
});
