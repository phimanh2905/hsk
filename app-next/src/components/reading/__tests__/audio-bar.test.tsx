import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AudioBar } from "../audio-bar";

function setup(overrides: Partial<Parameters<typeof AudioBar>[0]> = {}) {
  const onPlayPause = vi.fn();
  const onSeek = vi.fn();
  const onRate = vi.fn();
  const onReplay = vi.fn();
  render(
    <AudioBar
      playing={false}
      index={2}
      total={10}
      rate={1}
      onPlayPause={onPlayPause}
      onSeek={onSeek}
      onRate={onRate}
      onReplay={onReplay}
      durationSec={120}
      {...overrides}
    />,
  );
  return { onPlayPause, onSeek, onRate, onReplay };
}

describe("AudioBar", () => {
  it("play/pause → onPlayPause", async () => {
    const user = userEvent.setup();
    const { onPlayPause } = setup();
    await user.click(screen.getByRole("button", { name: "Phát" }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it("đang phát → nút nhãn 'Tạm dừng'", () => {
    setup({ playing: true });
    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeTruthy();
  });

  it("slider: aria-valuemax = total-1, aria-valuenow = index", () => {
    setup();
    const slider = screen.getByRole("slider", { name: "Vị trí câu trong bài" });
    expect(slider.getAttribute("aria-valuemax")).toBe("9");
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
  });

  it("click trackbar → onSeek(index theo ratio)", () => {
    const { onSeek } = setup();
    const slider = screen.getByRole("slider", { name: "Vị trí câu trong bài" });
    // jsdom không layout: rect = 0 → ratio clamp 0 → seek câu 0
    fireEvent.click(slider, { clientX: 0 });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it("ArrowRight/ArrowLeft → onSeek(index ± 1)", () => {
    const { onSeek } = setup();
    const slider = screen.getByRole("slider", { name: "Vị trí câu trong bài" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenLastCalledWith(1);
  });

  it("↺ → onReplay; nút tốc độ → onRate; nhãn rate×", async () => {
    const user = userEvent.setup();
    const { onReplay, onRate } = setup({ rate: 1.25 });
    await user.click(screen.getByRole("button", { name: "Lùi một câu" }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Đổi tốc độ đọc" }));
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("1.25×")).toBeTruthy();
  });

  it("timecode ước lượng: (index+0.5)/total × duration", () => {
    setup({ index: 2, total: 10, durationSec: 120 });
    // (2.5/10)*120 = 30s → "00:30 / 02:00"
    expect(screen.getByText("00:30 / 02:00")).toBeTruthy();
  });
});
