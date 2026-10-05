import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ReadingLibraryRoot from "../reading-library-root";
import { progressStore } from "@/lib/store/progress-store";
import { READING_LIB } from "@/content/reading";

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

function card(id: string) {
  return document.querySelector(`[data-od-id="read-${id}"]`) as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReadingLibraryRoot", () => {
  it("mặc định render hero + 7 card + filters (đủ 6 level chip)", () => {
    render(<ReadingLibraryRoot />);
    expect(getByODId("reading-library")).toBeTruthy();
    expect(getByODId("reading-hero")).toBeTruthy();
    expect(getByODId("reading-grid").children.length).toBe(READING_LIB.length);
    expect(screen.getByRole("button", { name: "HSK 6" })).toBeTruthy();
  });

  it("đọc progress/saved từ store sau mount: card tea hiện progress + saved", () => {
    progressStore.recordReadingProgress("tea", 40);
    progressStore.toggleReadingSaved("tea");
    render(<ReadingLibraryRoot />);
    expect(card("tea")).toBeTruthy();
    expect(card("tea").textContent).toContain("Đang đọc dở (40%)");
    expect(card("tea").textContent).toContain("Đọc tiếp");
    const star = card("tea").querySelector('button[aria-label="Bỏ lưu"]');
    expect(star).toBeTruthy();
    // hero nhảy sang bài đầu chưa đọc
    expect(getByODId("reading-hero").textContent).toContain("Tết Trùng Cửu ở Trung Quốc");
  });

  it("filter level HSK 1 → còn 2 card (morning, demo-1)", () => {
    render(<ReadingLibraryRoot />);
    act(() => screen.getByRole("button", { name: "HSK 1" }).click());
    expect(getByODId("reading-grid").children.length).toBe(2);
    expect(card("morning")).toBeTruthy();
    expect(card("demo-1")).toBeTruthy();
  });

  it('search "trà" → chỉ còn card tea', () => {
    render(<ReadingLibraryRoot />);
    const input = screen.getByLabelText("Tìm bài đọc") as HTMLInputElement;
    act(() => {
      input.focus();
    });
    // set value + bắn input event (userEvent với tiếng Việt có dấu qua IME diff)
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "trà");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(getByODId("reading-grid").children.length).toBe(1);
    expect(card("tea")).toBeTruthy();
  });

  it("q không khớp → empty state; nút Xoá bộ lọc reset", () => {
    render(<ReadingLibraryRoot />);
    const input = screen.getByLabelText("Tìm bài đọc") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "zzzkhôngcó");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(getByODId("reading-empty")).toBeTruthy();
    expect(getByODId("reading-grid")).toBeNull();
    act(() => screen.getByRole("button", { name: "Xoá bộ lọc" }).click());
    expect(getByODId("reading-grid").children.length).toBe(READING_LIB.length);
  });

  it('phím "/" focus search input', () => {
    render(<ReadingLibraryRoot />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));
    });
    expect(document.activeElement).toBe(screen.getByLabelText("Tìm bài đọc"));
  });

  it("click star → toggleReadingSaved với đúng id + store cập nhật", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(progressStore, "toggleReadingSaved");
    render(<ReadingLibraryRoot />);
    await user.click(card("frog").querySelector('button[aria-label="Lưu bài"]') as HTMLElement);
    expect(spy).toHaveBeenCalledWith("frog");
    expect(progressStore.getReadingSavedIds()).toContain("frog");
    // event bye:progress → card re-render thành đã lưu
    expect(card("frog").querySelector('button[aria-label="Bỏ lưu"]')).toBeTruthy();
  });
});
