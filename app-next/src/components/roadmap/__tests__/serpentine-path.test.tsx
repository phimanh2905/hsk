import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SerpentinePath } from "../serpentine-path";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import { deriveStationStates } from "@/lib/roadmap-progress";

const hsk2 = getRoadmapLevel("hsk-2")!;

describe("SerpentinePath", () => {
  it("store rỗng: 1 node đang học + 6 node đang khóa (5 lesson + milestone)", () => {
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getAllByRole("button", { name: /— đang học$/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /— đang khóa/ })).toHaveLength(6);
  });

  it("card xen kẽ trái/phải: label node chứa aria đúng mock", () => {
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getByRole("button", { name: "Trạm 1: Chào hỏi & Làm quen — đang học" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Milestone ôn tập chặng — đang khóa" }),
    ).toBeTruthy();
  });

  it("click node khóa gọi onOpen với id đúng", async () => {
    const onOpen = vi.fn();
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={onOpen} onContinue={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Trạm 2: Số đếm & Mua sắm — đang khóa" }));
    expect(onOpen).toHaveBeenCalledWith("2");
  });

  it("CTA 'Vào bài học' của card active gọi onContinue", async () => {
    const onContinue = vi.fn();
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole("button", { name: /Vào bài học/ }));
    expect(onContinue).toHaveBeenCalledWith("1");
  });
});
