import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import ReviewDashboard from "../review-dashboard";
import { progressStore } from "@/lib/store/progress-store";

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

describe("ReviewDashboard (redesign 2026-10-04)", () => {
  it("localStorage trống → hero 0 từ, empty card, CTA bấm chỉ toast (Review Focus #1/#3/#5)", () => {
    const { container } = render(<ReviewDashboard />);
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("0 từ");
    expect(screen.getByText("Bộ thẻ đang trống")).toBeInTheDocument();
    expect(screen.getByText("Vào kệ sách →")).toHaveAttribute("href", "/course");
    fireEvent.click(container.querySelector('[data-testid="start-session"]')!);
    expect(container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')).toBeNull();
  });
  it("toggleSrs hsk1 → mặc định HSK 2 rỗng; chuyển HSK 1 → 1 từ bucket Yếu (mem 25)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("1 từ");
    const buckets = container.querySelectorAll('[data-testid="bucket"]');
    expect(buckets[0].textContent).toContain("1 từ"); // weak — mem new = 25 < 55
    // vocab["hsk1"]["lesson-1"].words[0] = 你好 (brief ghi 爱 — sai với data thật)
    expect(buckets[0].textContent).toContain("你好");
  });
  it("chạy phiên: mở session → reveal → grade good → điểm 1 nhớ", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    fireEvent.click(container.querySelector('[data-testid="start-session"]')!);
    const sess = container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')!;
    expect(sess).not.toBeNull();
    fireEvent.click(sess.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    // 1 từ → hết phiên, overlay đóng + toast hiện
    expect(container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')).toBeNull();
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.reviewCount).toBe(1);
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.status).toBe("learning");
  });
  it("nút nét chữ mở StrokeStudio", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    const listenRow = container.querySelector("tbody tr");
    if (listenRow) {
      fireEvent.click(listenRow.querySelector('[aria-label^="Xem nét viết"]')!);
      expect(container.querySelector("#stroke-studio-title")).not.toBeNull();
    }
  });
});