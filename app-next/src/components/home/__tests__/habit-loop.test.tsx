import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HabitLoop from "../habit-loop";

beforeEach(() => localStorage.clear());

describe("HabitLoop (spec 2026-10-04)", () => {
  it("hiện 3 bước với số 1/2/3", async () => {
    render(<HabitLoop />);
    for (const n of ["1", "2", "3"]) {
      expect(await screen.findByText(n, { selector: "span" })).toBeInTheDocument();
    }
  });
  it("SRS due=0 → card 2 tone idle 'CHƯA CÓ TỪ ĐẾN HẠN'", async () => {
    render(<HabitLoop />);
    // Card 2 cụ thể — pattern chung trúng nhiều chip (card 1/3 cũng "CHƯA BẮT ĐẦU")
    expect(await screen.findByText("CHƯA CÓ TỪ ĐẾN HẠN")).toBeInTheDocument();
  });
  it("SRS due>0 → tone todo + số từ", async () => {
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({ k: { key: "k", status: "new", dueAt: Date.now() - 100, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 } })
    );
    render(<HabitLoop />);
    expect(await screen.findByText(/CẦN LÀM · 1/)).toBeInTheDocument();
  });
  it("nút card 2 trỏ /review, card 3 trỏ /shadowing", async () => {
    render(<HabitLoop />);
    expect((await screen.findByRole("link", { name: /Ôn tập ngay/ })).getAttribute("href")).toBe("/review");
    expect(screen.getByRole("link", { name: /Bắt đầu · 2 phút/ }).getAttribute("href")).toBe("/shadowing");
  });
});
