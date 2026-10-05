import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecorder } from "@/lib/shadowing/use-recorder";

describe("useRecorder — jsdom không có mediaDevices → simMode", () => {
  it("start/stop trả bản ghi giả với secs > 0", async () => {
    const { result } = renderHook(() => useRecorder());
    act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    expect(result.current.simMode).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    let rec: { blob: Blob; secs: number } | null = null;
    act(() => { rec = result.current.stop(); });
    expect(result.current.recording).toBe(false);
    expect(rec).not.toBeNull();
    expect(rec!.secs).toBeGreaterThan(0);
    expect(rec!.blob).toBeInstanceOf(Blob);
  });
  it("stop khi không đang ghi → null", () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.stop()).toBeNull();
  });
  it("stop() trong lúc getUserMedia pending → hủy sạch, không kẹt recording (real path)", async () => {
    let resolveGUM!: (s: MediaStream) => void;
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const gum = vi.fn(() => new Promise<MediaStream>((res) => { resolveGUM = res; }));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: gum }, configurable: true });
    (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = class {
      mimeType = "audio/webm";
      onstop: (() => void) | null = null;
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      start() { /* noop */ }
      stop() { /* noop */ }
    };
    try {
      const { result } = renderHook(() => useRecorder());
      act(() => result.current.start());
      // promise chưa resolve → chưa recording, nhưng startingRef đang giữ
      expect(result.current.recording).toBe(false);
      // stop trước khi promise resolve → trả null (bản ghi chưa bắt đầu)
      expect(result.current.stop()).toBeNull();
      expect(result.current.recording).toBe(false);
      // promise resolve sau đó → stream bị dọn, KHÔNG flip recording=true
      await act(async () => {
        resolveGUM(stream);
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(track.stop).toHaveBeenCalled();
      expect(result.current.recording).toBe(false);
      expect(result.current.stop()).toBeNull();
    } finally {
      delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
      delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    }
  });
});
