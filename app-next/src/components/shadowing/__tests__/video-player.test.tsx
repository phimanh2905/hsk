import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VideoPlayer, { findSentenceIndex } from "../video-player";
import { shadowingVideoById, shadowingSubtitles } from "@/content/shadowing";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: (t: string) => { (window as unknown as { __lastSpeak?: string }).__lastSpeak = t; }, cancel: () => {}, speaking: false }),
}));

const video = shadowingVideoById("EA3rwvr99Q0")!;
const subs = shadowingSubtitles["EA3rwvr99Q0"];

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("findSentenceIndex (port tick của clone)", () => {
  it("t trong [start,end) → đúng câu; t≥end cuối → câu cuối; t giữa 2 câu → câu sau", () => {
    expect(findSentenceIndex(subs, 5)).toBe(0);
    expect(findSentenceIndex(subs, 18)).toBe(1);
    expect(findSentenceIndex(subs, 200)).toBe(8);
  });
});

describe("VideoPlayer — render + transcript + fallback TTS 4s", () => {
  it("render iframe nocookie + tiêu đề + 9 câu đánh số", () => {
    render(<VideoPlayer video={video} subtitles={subs} />);
    const frame = screen.getByTitle(/YouTube/) as HTMLIFrameElement;
    expect(frame.src).toContain("https://www.youtube-nocookie.com/embed/EA3rwvr99Q0?enablejsapi=1");
    expect(screen.getAllByText(/^#\d+$/)).toHaveLength(9);
  });
  it("4s không ytReady → overlay + banner TTS + speak câu hiện tại", () => {
    render(<VideoPlayer video={video} subtitles={subs} />);
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.getByTestId("video-overlay")).not.toHaveClass("hidden");
    expect(screen.getByText(/Dùng TTS đọc câu/)).toBeTruthy();
    expect((window as unknown as { __lastSpeak?: string }).__lastSpeak).toContain("我才离开几天");
  });
  it("bấm câu #3 → cur=2 (slice hiển thị 'Câu 3/9'), nút ⏮/⏭ đổi cur", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<VideoPlayer video={video} subtitles={subs} />);
    await user.click(screen.getAllByText(/^#3$/)[0]);
    await waitFor(() => expect(screen.getByTestId("pos")).toHaveTextContent("Câu 3/9"));
    await user.click(screen.getByText("⏭ Câu sau"));
    expect(screen.getByTestId("pos")).toHaveTextContent("Câu 4/9");
    await user.click(screen.getByText("⏮ Câu trước"));
    await user.click(screen.getByText("⏮ Câu trước"));
    expect(screen.getByTestId("pos")).toHaveTextContent("Câu 2/9");
  });
  it("postMessage gửi command seekTo đúng start câu khi bấm câu", async () => {
    const sent: string[] = [];
    render(<VideoPlayer video={video} subtitles={subs} postSink={(m) => sent.push(m)} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getAllByText(/^#5$/)[0]);
    expect(sent.some((m) => m.includes('"seekTo"') && m.includes("[56,true]"))).toBe(true);
  });
});
