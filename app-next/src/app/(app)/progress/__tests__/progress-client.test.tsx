import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressClient from "../progress-client";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

beforeEach(() => localStorage.clear());

describe("ProgressClient (F2)", () => {
  it("chưa login → gate 🔒 với sub progress", () => {
    render(<ProgressClient />);
    expect(screen.getByText("Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.")).toBeInTheDocument();
  });
  it("mockLogin → card Điểm của bạn + rank #14594 (xp=0) + 4 stat card", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    render(<ProgressClient />);
    expect(screen.getByText("Điểm của bạn")).toBeInTheDocument();
    expect(screen.getByText("#14594")).toBeInTheDocument();
    expect(screen.getByText("Mỗi câu trả lời đúng +1 điểm")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi ngày học")).toBeInTheDocument();
    expect(screen.getByText("trên tổng 9789 từ")).toBeInTheDocument();
    expect(screen.getByText("Xong khi học đủ 2 chế độ")).toBeInTheDocument();
    expect(screen.getByText(/153/)).toBeInTheDocument();
  });
  it("xp > 0 → rank = 14594 − xp", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    localStorage.setItem("nhai.xp", "94");
    render(<ProgressClient />);
    expect(screen.getByText("#14500")).toBeInTheDocument();
  });
});
