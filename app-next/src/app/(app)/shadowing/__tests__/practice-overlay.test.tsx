import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

export const speakMock = vi.fn();
export const recordPractice = vi.fn();

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: speakMock, cancel: vi.fn(), speaking: false }) }));
vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({ recordPractice, progressMap: {}, metrics: { practiced: 0, seconds: 0, avgScore: null }, ready: true }),
}));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

import { PracticeOverlay } from "../practice-overlay";
import { videosFixture, subsFixture } from "@/lib/shadowing/__tests__/fixtures";

const v = videosFixture[0];
const lines = subsFixture[v.id];

describe("PracticeOverlay (port practice-session)", () => {
  it("câu đầu render + Esc/Nút thoát đóng không ghi progress", () => {
    const onClose = vi.fn();
    render(<PracticeOverlay video={v} lines={lines} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Luyện shadowing" })).toBeInTheDocument();
    expect(screen.getByText("Câu 1 / 2 · " + v.title)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(recordPractice).not.toHaveBeenCalled();
  });
  it("Nghe mẫu → TTS; xong câu cuối → recordPractice done + toast + đóng", () => {
    const onClose = vi.fn();
    render(<PracticeOverlay video={v} lines={lines} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Nghe mẫu" }));
    expect(speakMock).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đã đọc xong · câu sau" }));
    expect(screen.getByText("Câu 2 / 2 · " + v.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đã đọc xong · câu sau" }));
    expect(recordPractice).toHaveBeenCalledWith(v.id, expect.objectContaining({ status: "done", score: 88 }));
    expect(onClose).toHaveBeenCalled();
  });
});
