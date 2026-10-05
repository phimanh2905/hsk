import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import GlanceGreeting from "../glance-greeting";

/* Goal ring là điểm dễ vỡ nhất (toạ độ <text> theo viewBox 44 + aria-label động):
   test khoá cả greeting theo giờ lẫn aria-label goal ring — sai bất kỳ cái nào
   (đổi DAILY_GOAL_XP, mất mounted-gate, đổi toạ độ text) đều fail. */
const mockState = vi.hoisted(() => ({ todayXp: 7, streak: 5, mounted: true }));
vi.mock("@/lib/home-summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home-summary")>();
  return {
    ...actual,
    useHomeSummary: () => ({
      ...actual.readHomeSummary(),
      todayXp: mockState.mounted ? mockState.todayXp : 0,
      streak: mockState.streak,
      mounted: mockState.mounted,
    }),
  };
});

beforeEach(() => {
  mockState.todayXp = 7;
  mockState.streak = 5;
  mockState.mounted = true;
});

/* Mount xong greeting phải chứa bucket đúng theo giờ ĐỊA PHƯƠNG (render, không
   gọi hàm nội bộ — M1/M3: verify qua output UI). */
function expectGreeting(zh: string) {
  expect(screen.getByRole("heading", { name: /, chào bạn!/ }).textContent).toContain(zh);
}

describe("GlanceGreeting (spec 2026-10-04)", () => {
  it("greeting theo giờ VN: sáng/chiều/tối", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-05T08:00:00"));
      const { unmount } = render(<GlanceGreeting />);
      expectGreeting("早上好");
      unmount();
      vi.setSystemTime(new Date("2026-10-05T13:00:00"));
      const { unmount: u2 } = render(<GlanceGreeting />);
      expectGreeting("下午好");
      u2();
      vi.setSystemTime(new Date("2026-10-05T20:00:00"));
      render(<GlanceGreeting />);
      expectGreeting("晚上好");
    } finally {
      vi.useRealTimers();
    }
  });

  it("SSR-stable: HTML prerender KHÔNG phụ thuộc giờ hệ thống (C1 hydration gate)", () => {
    mockState.mounted = false;
    vi.useFakeTimers();
    try {
      // 2 mốc giờ khác bucket — nếu greeting/ngày lọt vào HTML prerender,
      // server TZ ≠ client TZ sẽ hydration mismatch. Output phải giống hệt nhau.
      vi.setSystemTime(new Date("2026-10-05T08:00:00"));
      const ssrMorning = renderToString(<GlanceGreeting />);
      vi.setSystemTime(new Date("2026-10-05T20:00:00"));
      const ssrEvening = renderToString(<GlanceGreeting />);
      expect(ssrEvening).toBe(ssrMorning);
      expect(ssrMorning).not.toContain("早上好");
      expect(ssrMorning).not.toContain("下午好");
      expect(ssrMorning).not.toContain("晚上好");
    } finally {
      vi.useRealTimers();
    }
  });

  it("hiện chào, XP hôm nay và goal ring với aria-label đúng", () => {
    render(<GlanceGreeting />);
    expect(screen.getByRole("heading", { name: /chào bạn!/ })).toBeVisible();
    expect(screen.getByText("7/20 XP")).toBeVisible();
    expect(screen.getByRole("img", { name: "Hôm nay 7 trên 20 XP" })).toBeVisible();
    expect(screen.getByText("7′")).toBeVisible();
  });

  it("trước mount: streak pill ẩn, goal ring về 0 nhưng vẫn render (SSR-safe)", () => {
    mockState.mounted = false;
    render(<GlanceGreeting />);
    expect(screen.queryByText("5 ngày liên tục")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hôm nay 0 trên 20 XP" })).toBeVisible();
    expect(screen.getByText("0/20 XP")).toBeVisible();
  });
});
