import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroAction from "../hero-action";

/* Điều khiển được flag `mounted` để test SSR-safe: với mounted=false, component
   PHẢI render null — test fail nếu bỏ gate `if (!s.mounted) return null`. */
const mockState = vi.hoisted(() => ({ mounted: true }));
vi.mock("@/lib/home-summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home-summary")>();
  return {
    ...actual,
    useHomeSummary: () => ({ ...actual.readHomeSummary(), mounted: mockState.mounted }),
  };
});

beforeEach(() => {
  localStorage.clear();
  mockState.mounted = true;
});

describe("HeroAction (spec 2026-10-04)", () => {
  it("không render gì trước mount (SSR-safe)", () => {
    mockState.mounted = false;
    const { container } = render(<HeroAction />);
    expect(container).toBeEmptyDOMElement();
  });
  it("localStorage rỗng → fallback mời bắt đầu /course", async () => {
    render(<HeroAction />);
    const link = await screen.findByRole("link", { name: /Bắt đầu/ });
    expect(link.getAttribute("href")).toBe("/course");
  });
  it("có pageDone → tab lesson hiện bài kế tiếp, CTA /lesson/...", async () => {
    localStorage.setItem("bye.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<HeroAction />);
    const cta = await screen.findByRole("link", { name: /Tiếp tục/ });
    expect(cta.getAttribute("href")).toBe("/lesson/hsk1/lesson-2");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Tiến độ bài học");
  });
  it("chuyển tab SRS đổi CTA sang /review và aria-pressed đúng", async () => {
    localStorage.setItem("bye.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<HeroAction />);
    await screen.findByRole("link", { name: /Tiếp tục/ });
    await userEvent.click(screen.getByRole("button", { name: /Ôn tập SRS/ }));
    expect(screen.getByRole("link", { name: /Flashcard/ })).toHaveAttribute("href", "/review");
    expect(screen.getByRole("button", { name: /Ôn tập SRS/ })).toHaveAttribute("aria-pressed", "true");
  });
});
