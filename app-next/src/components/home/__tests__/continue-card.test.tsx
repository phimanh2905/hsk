import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ContinueCard from "../continue-card";

beforeEach(() => localStorage.clear());

describe("ContinueCard (B1)", () => {
  it("ẩn khi chưa có pageDone", () => {
    render(<ContinueCard />);
    expect(screen.queryByText(/Học tiếp/)).not.toBeInTheDocument();
  });
  it("hiện 'Học tiếp' đúng bài kế chưa hoàn thành", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<ContinueCard />);
    const link = screen.getByText(/Học tiếp/).closest("a")!;
    expect(link.getAttribute("href")).toBe("/lesson/hsk1/lesson-2");
  });
});
