import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SyllableTablePage from "../page";

describe("/pinyin/bang-am page", () => {
  it("render h1 + mô tả phân vai + 2 CTA", () => {
    render(<SyllableTablePage />);
    expect(screen.getByRole("heading", { level: 1, name: /Bảng Pinyin/i })).toBeInTheDocument();
    expect(screen.getByText(/405/)).toBeInTheDocument();
    const practice = screen.getByRole("link", { name: /Luyện phản xạ tai/i });
    expect(practice).toHaveAttribute("href", "/pinyin?mode=quiz");
    const roadmap = screen.getByRole("link", { name: /Học lộ trình/i });
    expect(roadmap).toHaveAttribute("href", "/roadmap/pinyin");
  });
  it("chứa bảng 405 ô", () => {
    render(<SyllableTablePage />);
    // Desktop và mobile cùng render mỗi ô 2 lần (ẩn bằng CSS); jsdom không có
    // checkVisibility nên đếm trong container desktop (data-testid) để đếm đúng 405.
    const desktop = within(screen.getByTestId("syllable-table-desktop"));
    expect(desktop.getAllByRole("button", { name: /âm tiết/i }).length).toBe(405);
  });
});
