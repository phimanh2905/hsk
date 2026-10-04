import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { StrokeStudio } from "../stroke-studio";

afterEach(cleanup);

beforeEach(() => {
  // jsdom thiếu speechSynthesis — stub tối thiểu cho useTts
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

describe("StrokeStudio", () => {
  it("từ 1 chữ có data (爱): 10 nét trong order list, py-pill hiện ài", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    expect(container.textContent).toContain("ài");
    expect(container.textContent).toContain("Bộ Trảo");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(10);
    expect(container.textContent).toContain("Phát lại");
  });
  it("từ nhiều chữ (爱好): 2 tab theo chữ, tab active có aria-pressed", () => {
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    const tabs = container.querySelectorAll("[data-testid='char-tab']");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(6); // 好 6 nét
  });
  it("chữ không có data: nodata rad-line + order list", () => {
    const { container } = render(<StrokeStudio word="吗" onClose={() => {}} />);
    expect(container.textContent).toContain("sẽ được bổ sung dữ liệu bút thuận");
    expect(container.textContent).toContain("Chưa có dữ liệu nét cho chữ này.");
  });
  it("speed-seg aria-pressed chuyển; click order-row không văng", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    const seg = container.querySelectorAll("[data-testid='speed-btn']");
    expect(seg).toHaveLength(3);
    fireEvent.click(seg[2]);
    expect(seg[2].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector("[data-testid='order-row']")!);
  });
  it("đổi chữ reset tốc độ về 1x (seg khớp playback)", () => {
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    fireEvent.click(container.querySelectorAll("[data-testid='speed-btn']")[2]); // 1.5x
    expect(container.querySelectorAll("[data-testid='speed-btn']")[2].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelectorAll("[data-testid='char-tab']")[1]);
    const seg = container.querySelectorAll("[data-testid='speed-btn']");
    expect(seg[1].getAttribute("aria-pressed")).toBe("true"); // về 1x
    expect(seg[2].getAttribute("aria-pressed")).toBe("false");
  });
  it("nút đóng gọi onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<StrokeStudio word="爱" onClose={onClose} />);
    fireEvent.click(container.querySelector("[aria-label='Đóng bảng nét chữ']")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
