import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoadmapTopbar } from "../roadmap-topbar";

const levels = [
  { id: "hsk-1" as const, label: "HSK 1" },
  { id: "hsk-2" as const, label: "HSK 2" },
];

describe("RoadmapTopbar", () => {
  it("back-link về Home", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={30} />);
    expect(screen.getByRole("link", { name: /Home/ }).getAttribute("href")).toBe("/");
  });
  it("head-progress hiện nhãn %", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={30} />);
    expect(screen.getByText("30%")).toBeTruthy();
  });
  it("không có nút theme toggle (shell đã có — spec §6)", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={0} />);
    expect(screen.queryByRole("button", { name: /chế độ sáng tối/i })).toBeNull();
  });
});
