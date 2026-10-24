import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressMatrix from "../progress-matrix";

beforeEach(() => localStorage.clear());

describe("ProgressMatrix (spec 2026-10-04)", () => {
  it("ring + các hàng thống kê không NaN khi localStorage rỗng", async () => {
    render(<ProgressMatrix />);
    expect(await screen.findByRole("img", { name: /từ/ })).toBeInTheDocument();
    // "0 / N từ đã nhớ" — pattern /0 \// trúng cả heading và stat row → getAllByText
    expect(screen.getAllByText(/0 \//).length).toBeGreaterThan(0); // "0 / N từ đã nhớ"
    expect(screen.getByRole("link", { name: /Xem toàn bộ lộ trình/ })).toHaveAttribute("href", "/roadmap");
  });
  it("4 quick tools trỏ đúng route", async () => {
    render(<ProgressMatrix />);
    for (const [name, href] of [
      [/Hanzi Studio/, "/hanzi"],
      [/Bảng âm Pinyin/, "/pinyin"],
      [/Sổ tay từ vựng/, "/my-vocab"],
      [/Thư viện đọc hiểu/, "/reading"],
    ] as const) {
      expect((await screen.findByRole("link", { name })).getAttribute("href")).toBe(href);
    }
  });
  it("có SRS đã thuộc (format 4: status review) → số từ đã nhớ > 0", async () => {
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({
        a: { key: "a", status: "review", intervalDays: 7, ease: 2.5, lapses: 0, dueAt: null, reviewCount: 2, lastReviewedAt: 1, updatedAt: 1 },
        b: { key: "b", status: "review", intervalDays: 21, ease: 2.5, lapses: 0, dueAt: null, reviewCount: 3, lastReviewedAt: 1, updatedAt: 1 },
      })
    );
    render(<ProgressMatrix />);
    // W5.1 SM-2: chỉ item b (review, interval 21) là mature → "1 / N từ đã nhớ"
    expect(screen.getAllByText(/1 \//).length).toBeGreaterThan(0);
  });
});
