import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TtsConsentDialog from "../tts-consent-dialog";
import type { TtsOrchestratorState } from "@/lib/tts/engine";

const orch = {
  getState: vi.fn<() => TtsOrchestratorState>(() => ({ kind: "idle" })),
  subscribe: vi.fn(() => vi.fn()),
  acceptConsent: vi.fn(),
  retryAfterError: vi.fn(async () => {}),
};
vi.mock("@/lib/tts/engine", () => ({
  getTtsOrchestrator: () => orch,
}));

beforeEach(() => {
  orch.getState.mockReturnValue({ kind: "idle" });
  orch.acceptConsent.mockClear();
  orch.retryAfterError.mockClear();
});

describe("TtsConsentDialog", () => {
  it("state idle -> dialog đóng", () => {
    render(<TtsConsentDialog />);
    expect(screen.queryByText("Giọng đọc Bye HSK")).toBeNull();
  });

  it("state consent -> hiện dialog với nút tải / dùng giọng hệ thống", () => {
    orch.getState.mockReturnValue({ kind: "consent" });
    render(<TtsConsentDialog />);
    expect(screen.getByText("Giọng đọc Bye HSK")).toBeTruthy();
    fireEvent.click(screen.getByText("Tải giọng Bye HSK"));
    expect(orch.acceptConsent).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText("Dùng giọng hệ thống"));
    expect(orch.acceptConsent).toHaveBeenCalledWith(false);
  });

  it("state downloading -> hiện progress MB, không nút accept nữa", () => {
    orch.getState.mockReturnValue({
      kind: "downloading",
      received: 52428800,
      total: 171966464,
    });
    render(<TtsConsentDialog />);
    expect(screen.getByText(/50 MB/)).toBeTruthy();
    expect(screen.queryByText("Tải giọng Bye HSK")).toBeNull();
    expect(screen.getByText("Bỏ qua, dùng giọng hệ thống")).toBeTruthy();
  });

  it("state error trong dialog -> hiện message + nút thử lại", () => {
    orch.getState.mockReturnValue({ kind: "error", message: "offline" });
    render(<TtsConsentDialog />);
    expect(screen.getByText(/offline/)).toBeTruthy();
    fireEvent.click(screen.getByText("Thử lại"));
    expect(orch.retryAfterError).toHaveBeenCalled();
  });
});
