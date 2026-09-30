import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionClient from "../session-client";
import { progressStore } from "@/lib/store/progress-store";
import { roadmapSessions } from "@/content/roadmap";

// Render ngoài App Router (vitest/jsdom) — mock useRouter để router.push không throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("SessionClient (E3)", () => {
  it("4 tab đúng thứ tự; tab Bài kiểm tra mở ở buổi 1", () => {
    render(<SessionClient n={1} />);
    expect(screen.getByRole("button", { name: /Học/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Flashcard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bài kiểm tra/ })).toBeInTheDocument();
  });
  it("Trắc nghiệm chấm + Làm lại", async () => {
    render(<SessionClient n={1} />);
    act(() => screen.getByRole("button", { name: /Trắc nghiệm/ }).click());
    const q = roadmapSessions[0].quiz[0];
    await act(async () => screen.getByRole("button", { name: q.options[q.answer] }).click());
    expect(screen.getByText(/Đúng 1\/2/)).toBeInTheDocument();
  });
  it("Bài kiểm tra: nút hoàn thành chỉ bật khi đạt >=1/2; bấm ghi done", async () => {
    const user = userEvent.setup();
    render(<SessionClient n={1} />);
    act(() => screen.getByRole("button", { name: /Bài kiểm tra/ }).click());
    const doneBtn = screen.getByRole("button", { name: /Hoàn thành buổi 1/ });
    expect(doneBtn).toBeDisabled();
    const t = roadmapSessions[0].test;
    const quizItem = t.find((x) => x.kind === "quiz")!;
    await user.click(screen.getByRole("button", { name: quizItem.options![quizItem.answer!] }));
    expect(doneBtn).toBeEnabled();
    await user.click(doneBtn);
    expect(progressStore.getRoadmapDone()).toContain(1);
  });
  it("buổi 2 khóa tab Bài kiểm tra khi buổi 1 chưa done", () => {
    render(<SessionClient n={2} />);
    expect(screen.getByRole("button", { name: /Bài kiểm tra/ }).textContent).toContain("🔒");
  });
});
