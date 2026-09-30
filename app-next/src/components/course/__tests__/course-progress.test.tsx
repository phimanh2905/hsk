import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseProgress from "../course-progress";

beforeEach(() => localStorage.clear());

describe("CourseProgress (B2)", () => {
  it("0/15 khi trống", () => {
    render(<CourseProgress book="hsk1" />);
    expect(screen.getByText("0/15 bài")).toBeInTheDocument();
  });
  it("đếm đúng theo pageDone của book", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1, "hsk1/lesson-2": 1, "hsk2/lesson-1": 1 }));
    render(<CourseProgress book="hsk1" />);
    expect(screen.getByText("2/15 bài")).toBeInTheDocument();
  });
});
