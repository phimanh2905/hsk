import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import JourneyCard from "../journey-card";

beforeEach(() => localStorage.clear());

describe("JourneyCard (E1)", () => {
  it("0% khi chưa làm buổi nào, link Tiếp tục học đúng", () => {
    render(<JourneyCard />);
    expect(screen.getByText(/0% toàn lộ trình/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tiếp tục học/ }).getAttribute("href")).toBe("/roadmap/pinyin");
  });
  it("phản ánh buổi pinyin đã xong (3/8 = 37%)", () => {
    localStorage.setItem("nhai.roadmap.pinyin", JSON.stringify([1, 2, 3]));
    render(<JourneyCard />);
    expect(screen.getByText(/37% toàn lộ trình/)).toBeInTheDocument();
  });
});
