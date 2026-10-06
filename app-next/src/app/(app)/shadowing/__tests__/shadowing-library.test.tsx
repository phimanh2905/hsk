import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ShadowingLibrary from "../shadowing-library";

vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({
    progressMap: { "EA3rwvr99Q0": { status: "done", score: 88, seconds: 120, linesDone: 9, updatedAt: "" } },
    metrics: { practiced: 1, seconds: 120, avgScore: 88 },
    recordPractice: vi.fn(), ready: true,
  }),
}));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

import { videosFixture, subsFixture } from "@/lib/shadowing/__tests__/fixtures";

beforeEach(() => localStorage.clear());

describe("ShadowingLibrary (port shadow-header/daily-pick/filter-toolbar/video-grid)", () => {
  it("header: h1 + 3 metric pills từ progress", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByTestId("shadow-header")).toHaveTextContent("影子跟读");
    expect(screen.getByText(/1 bài đã luyện/)).toBeInTheDocument();
    expect(screen.getByText(/2 phút nói/)).toBeInTheDocument();
    expect(screen.getByText(/88% chuẩn ngữ điệu/)).toBeInTheDocument();
  });
  it("hero daily-pick: scenario pill + CTA", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByTestId("daily-pick")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bắt đầu luyện nói ngay/ })).toBeInTheDocument();
  });
  it("filter CẤP ĐỘ thu grid; grid rỗng → empty state", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    const grid = screen.getByTestId("video-grid");
    expect(within(grid).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "HSK 1" }));
    expect(within(grid).getAllByRole("button").length).toBeLessThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "HSK 4-6" }));
    expect(screen.getByText(/Không có video nào khớp bộ lọc/)).toBeInTheDocument();
  });
  it("search theo zh/py/vi", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    fireEvent.change(screen.getByLabelText("Tìm video"), { target: { value: "zzz-không-có" } });
    expect(screen.getByText(/Không có video nào khớp bộ lọc/)).toBeInTheDocument();
  });
  it("status pill: done jade / chưa học neutral", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByText(/Đã hoàn thành · 88%/)).toBeInTheDocument();
    expect(screen.getByText("Chưa học")).toBeInTheDocument();
  });
});
