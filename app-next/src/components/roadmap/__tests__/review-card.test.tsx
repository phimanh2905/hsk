import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SrsItem } from "@/lib/stats/review";
import { ReviewCard } from "../review-card";

/* Fixture khớp SrsItem thật (src/lib/stats/review.ts) — không có createdAt. */
const item = (due: number | null, status: SrsItem["status"] = "review"): SrsItem => ({
  key: "k",
  status,
  ease: 2.5,
  intervalDays: 1,
  lapses: 0,
  dueAt: due,
  reviewCount: 1,
  lastReviewedAt: 1,
  updatedAt: 1,
});

beforeEach(() => localStorage.clear());

describe("ReviewCard", () => {
  it("link /review; 0 thẻ đến hạn → không có badge", () => {
    render(<ReviewCard />);
    const link = screen.getByRole("link", { name: /Ôn tập ngắt quãng/ });
    expect(link.getAttribute("href")).toBe("/review");
    expect(screen.queryByTestId("review-due")).toBeNull();
  });

  it("đếm đúng thẻ đến hạn (status ≠ new, dueAt <= now)", () => {
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({
        a: item(Date.now() - 1000),
        b: item(Date.now() + 86400000), // chưa đến hạn
        c: item(Date.now() - 1000, "new"), // new không tính
        d: item(null), // không hạn
      }),
    );
    render(<ReviewCard />);
    expect(screen.getByTestId("review-due")).toHaveTextContent("1 thẻ đến hạn");
  });
});
