import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationCard } from "../station-card";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import type { StationView } from "@/lib/roadmap-progress";

const hsk2 = getRoadmapLevel("hsk-2")!;
const mkView = (id: string, state: StationView["state"]): StationView => ({
  station: hsk2.stations.find((s) => s.id === id)!,
  state,
  pct: state === "done" ? 100 : state === "active" ? 55 : 0,
  stars: state === "done" ? 3 : 0,
});

describe("StationCard", () => {
  it("done: title + meta + 3 sao, click mở drawer", async () => {
    const onOpen = vi.fn();
    render(<StationCard view={mkView("1", "done")} side="left" onOpen={onOpen} onContinue={() => {}} />);
    expect(screen.getByText(/Trạm 1: Chào hỏi & Làm quen/)).toBeTruthy();
    expect(screen.getByLabelText("Đạt 3/3 sao")).toBeTruthy();
    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("1");
  });

  it("active: float-badge ĐANG HỌC · 55% + CTA Vào bài học (onContinue, không onOpen)", async () => {
    const onOpen = vi.fn();
    const onContinue = vi.fn();
    render(<StationCard view={mkView("4", "active")} side="right" onOpen={onOpen} onContinue={onContinue} />);
    expect(screen.getByText(/ĐANG HỌC · 55%/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Vào bài học/ }));
    expect(onContinue).toHaveBeenCalledWith("4");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("locked: meta khóa, không sao", () => {
    render(<StationCard view={mkView("5", "locked")} side="left" onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getByText(/Khóa · mở sau khi xong Bài 4/)).toBeTruthy();
    expect(screen.queryByLabelText(/sao/)).toBeNull();
  });

  it("milestone: MILESTONE + diamond gem, click mở drawer", async () => {
    const onOpen = vi.fn();
    render(<StationCard view={mkView("m", "locked")} side="right" onOpen={onOpen} onContinue={() => {}} />);
    expect(screen.getByText(/MILESTONE: Ôn tập chặng/)).toBeTruthy();
    expect(screen.getByRole("button").className).not.toContain("border-action-primary");
    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("m");
  });
});
