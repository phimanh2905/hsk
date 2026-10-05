import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GlanceGreeting, { greeting } from "../glance-greeting";

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

describe("GlanceGreeting (spec 2026-10-04)", () => {
  it("greeting theo giờ VN: sáng/chiều/tối", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-05T08:00:00"));
      expect(greeting()).toBe("早上好");
      vi.setSystemTime(new Date("2026-10-05T13:00:00"));
      expect(greeting()).toBe("下午好");
      vi.setSystemTime(new Date("2026-10-05T20:00:00"));
      expect(greeting()).toBe("晚上好");
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
