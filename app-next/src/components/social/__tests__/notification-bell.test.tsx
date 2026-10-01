import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell from "../notification-bell";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("NotificationBell", () => {
  it("mặc định ẩn popup; bấm chuông hiện đúng 3 thông báo cứng với link đúng", () => {
    render(<NotificationBell />);
    expect(screen.queryByText("Thông báo")).toBeNull();

    fireEvent.click(screen.getByTitle("Thông báo"));
    const items = screen.getAllByRole("link");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Bài mới: HSK 1 — Bài 1 Đồ ăn đã mở");
    expect(items[0]).toHaveAttribute("href", "/reading");
    expect(items[1]).toHaveAttribute("href", "/review");
    expect(items[2]).toHaveTextContent("Bạn đã vào top 10 Bảng xếp hạng XP tuần này");
    expect(items[2]).toHaveAttribute("href", "/leaderboard?tab=xp");
  });

  it("bấm lần nữa toggle đóng; Escape đóng popup", () => {
    render(<NotificationBell />);
    const bell = screen.getByTitle("Thông báo");
    fireEvent.click(bell);
    expect(screen.getByText("Thông báo")).toBeInTheDocument();
    fireEvent.click(bell); // popup toggle (giữ clone: bấm chuông khi đang mở → đóng)
    expect(screen.queryByText("Thông báo")).toBeNull();
    fireEvent.click(bell);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Thông báo")).toBeNull();
  });
});
