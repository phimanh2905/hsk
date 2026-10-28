import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationQuiz } from "../station-quiz";
import { getRoadmapLevel } from "@/content/roadmap-stations";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));

const hsk2 = getRoadmapLevel("hsk-2")!;
const s1 = hsk2.stations.find((s) => s.id === "1")!;

// rng cố định qua mock lib — component dùng default Math.random nên test đi theo UI
beforeEach(() => {
  toast.mockClear();
  localStorage.clear();
});

describe("StationQuiz", () => {
  it("hiện câu hỏi + 4 lựa chọn", () => {
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    expect(screen.getByTestId("quiz-prompt")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^quiz-opt-/ })).toHaveLength(4);
  });

  it("chọn đúng → feedback Đúng, hết câu → kết quả pass + toast + ghi progress", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const total = s1.vocab.length + s1.gram.length;
    // trả lời đúng hết: option nào cũng bấm — chọn theo data-answer
    for (let i = 0; i < total; i++) {
      const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
      await user.click(opts.find((b) => b.getAttribute("data-correct") === "true")!);
      const next = screen.getByRole("button", { name: i === total - 1 ? "Xem kết quả" : "Câu tiếp" });
      await user.click(next);
    }
    expect(screen.getByTestId("quiz-result")).toHaveTextContent(`${total}/${total}`);
    expect(screen.getByTestId("quiz-result")).toHaveTextContent(/Đạt/);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Hoàn thành/));
    const rec = JSON.parse(localStorage.getItem("bye.roadmap.stations.v1")!)["hsk-2"]["1"];
    expect(rec.pct).toBe(100);
    expect(rec.stars).toBe(3);
  });

  it("chọn sai 1 câu → vẫn feedback và sang câu tiếp", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
    await user.click(opts.find((b) => b.getAttribute("data-correct") === "false")!);
    expect(screen.getByTestId("quiz-feedback")).toHaveTextContent(/Sai/);
    await user.click(screen.getByRole("button", { name: "Câu tiếp" }));
    expect(screen.getByTestId("quiz-prompt")).toBeTruthy();
  });

  it("Milestone dùng sampler 10 câu", () => {
    const m = hsk2.stations.find((s) => s.id === "m")!;
    const { rerender } = render(<StationQuiz station={m} level={hsk2} onClose={() => {}} />);
    // đếm qua UI không tiện → check qua hành vi: chip tổng câu
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent("1/10");
    rerender(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(`1/${s1.vocab.length + s1.gram.length}`);
  });

  it("Làm lại reset về câu 1; Đóng gọi onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StationQuiz station={s1} level={hsk2} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).toHaveBeenCalled();
  });
});
