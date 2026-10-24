import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ProgressClient from "../progress-client";
import type { SrsItem } from "@/lib/store/progress-store";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

// UPG-2: session thật qua useSession, không đọc localStorage mock.
const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ ...session, name: "T", image: null, isPending: false, logout: vi.fn() }),
}));

beforeEach(() => {
  localStorage.clear();
  session.loggedIn = false;
});

function srsItem(partial: Partial<SrsItem>): SrsItem {
  return {
    status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null,
    updatedAt: 0, ease: 2.5, intervalDays: 0, lapses: 0, ...partial,
  };
}

describe("ProgressClient (F2)", () => {
  it("chưa login → gate 🔒 với sub progress", () => {
    render(<ProgressClient />);
    expect(screen.getByText("Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.")).toBeInTheDocument();
  });
  it("có session → card Điểm của bạn KHÔNG còn rank #placeholder + 4 stat card", () => {
    session.loggedIn = true;
    render(<ProgressClient />);
    expect(screen.getByText("Điểm của bạn")).toBeInTheDocument();
    // W5.2: bỏ chip rank placeholder (14594 − xp) — không còn text "#" nào trong DOM
    expect(screen.queryByText(/#/)).toBeNull();
    expect(screen.queryByText(/14594/)).toBeNull();
    expect(screen.getByText("Mỗi câu trả lời đúng +1 điểm")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi ngày học")).toBeInTheDocument();
    expect(screen.getByText("trên tổng 9789 từ")).toBeInTheDocument();
    expect(screen.getByText("Xong khi học đủ 2 chế độ")).toBeInTheDocument();
    expect(screen.getByText(/153/)).toBeInTheDocument();
  });
  it("xp > 0 → hiển thị số XP, không có rank", () => {
    session.loggedIn = true;
    localStorage.setItem("bye.xp", "94");
    render(<ProgressClient />);
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.queryByText(/#/)).toBeNull();
  });
  it("'Từ đã thuộc' = số SRS item mature (status review + intervalDays ≥ 21)", () => {
    session.loggedIn = true;
    localStorage.setItem("bye.srs.items", JSON.stringify({
      "hsk1.lesson-1.0": srsItem({ status: "review", intervalDays: 25 }),
      "hsk1.lesson-1.1": srsItem({ status: "review", intervalDays: 21 }), // biên 21 → mature
      "hsk1.lesson-1.2": srsItem({ status: "review", intervalDays: 20 }), // chưa mature
      "hsk1.lesson-1.3": srsItem({ status: "learning", intervalDays: 30 }), // learning → không mature
    }));
    render(<ProgressClient />);
    const card = screen.getByText("Từ đã thuộc").closest(".rounded-card")!;
    expect(within(card as HTMLElement).getByText("2")).toBeInTheDocument();
  });
});
