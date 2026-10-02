import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecorderPanel from "../recorder-panel";

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = "audio/webm";
  started = false; stopped = false;
  constructor(public stream: { getTracks: () => { stop: () => void }[] }) { FakeRecorder.instances.push(this); }
  start() { this.started = true; }
  stop() { this.stopped = true; this.onstop?.(); }
}
function fakeStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track], __track: track };
}

beforeEach(() => { FakeRecorder.instances = []; vi.stubGlobal("MediaRecorder", FakeRecorder); });
afterEach(() => { vi.unstubAllGlobals(); });

it("cấp quyền → record/stop → playback item xuất hiện, track dừng sau stop", async () => {
  const stream = fakeStream();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  const user = userEvent.setup();
  render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-btn")).toHaveTextContent("■ Dừng ghi âm"));
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-list").querySelector("audio")).toBeTruthy());
  expect(FakeRecorder.instances[0].started).toBe(true);
  expect(FakeRecorder.instances[0].stopped).toBe(true);
  expect(stream.__track.stop).toHaveBeenCalled();
});

it("từ chối quyền → im lặng không lỗi; thiếu API → click không làm gì", async () => {
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) } });
  const user = userEvent.setup();
  const { unmount } = render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-btn")).toHaveTextContent("● Bắt đầu ghi âm"));
  unmount();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
  vi.unstubAllGlobals();
  vi.stubGlobal("MediaRecorder", undefined);
  render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  expect(screen.queryByText("■ Dừng ghi âm")).toBeNull();
});

it("unmount khi đang ghi → rec.stop + track.stop + revokeObjectURL", async () => {
  const stream = fakeStream();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:fake", revokeObjectURL: revoke });
  const user = userEvent.setup();
  const { unmount } = render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(FakeRecorder.instances[0].started).toBe(true));
  unmount();
  expect(FakeRecorder.instances[0].stopped).toBe(true);
  expect(stream.__track.stop).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:fake");
});
