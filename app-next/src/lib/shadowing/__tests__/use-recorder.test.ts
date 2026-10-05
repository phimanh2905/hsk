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
});
