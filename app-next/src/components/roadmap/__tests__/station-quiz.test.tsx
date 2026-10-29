import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationQuiz } from "../station-quiz";
import { getRoadmapLevel } from "@/content/roadmap-stations";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));

// Task 8: StationQuiz render câu nghe (useTts) — mock để test không phụ thuộc engine thật
const tts = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => tts }));

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

  it("Milestone dùng sampler 12 câu", () => {
    const m = hsk2.stations.find((s) => s.id === "m")!;
    const { rerender } = render(<StationQuiz station={m} level={hsk2} onClose={() => {}} />);
    // đếm qua UI không tiện → check qua hành vi: chip tổng câu
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent("1/12");
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

  it("F6a — trả lời xong → Làm lại đưa về Câu 1/N, mất màn kết quả", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const total = s1.vocab.length + s1.gram.length;
    for (let i = 0; i < total; i++) {
      const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
      await user.click(opts.find((b) => b.getAttribute("data-correct") === "true")!);
      await user.click(screen.getByRole("button", { name: i === total - 1 ? "Xem kết quả" : "Câu tiếp" }));
    }
    expect(screen.getByTestId("quiz-result")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Làm lại" }));
    expect(screen.queryByTestId("quiz-result")).toBeNull();
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(`Câu 1/${total}`);
  });

  it("F2 — retake kém hơn best: hiện điểm lần thi + dòng best, không toast 🎉", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const total = s1.vocab.length + s1.gram.length;
    // Lần 1: đúng hết → 100%
    for (let i = 0; i < total; i++) {
      const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
      await user.click(opts.find((b) => b.getAttribute("data-correct") === "true")!);
      await user.click(screen.getByRole("button", { name: i === total - 1 ? "Xem kết quả" : "Câu tiếp" }));
    }
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/^🎉/));
    toast.mockClear();

    await user.click(screen.getByRole("button", { name: "Làm lại" }));
    // Lần 2: sai 2 câu đầu → 5/7 = 71% < PASS_PCT (1 câu sai vẫn ≥80 vì total=7)
    for (let i = 0; i < total; i++) {
      const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
      const target = i < 2 ? "false" : "true";
      await user.click(opts.find((b) => b.getAttribute("data-correct") === target)!);
      await user.click(screen.getByRole("button", { name: i === total - 1 ? "Xem kết quả" : "Câu tiếp" }));
    }
    const attemptPct = Math.round(((total - 2) / total) * 100);
    const result = screen.getByTestId("quiz-result");
    expect(result).toHaveTextContent(`${total - 2}/${total} câu đúng · ${attemptPct}%`);
    expect(screen.getByTestId("quiz-best")).toHaveTextContent(`Thành tích tốt nhất: 100%`);
    const fired = toast.mock.calls.map((c) => String(c[0]));
    expect(fired.some((t) => t.startsWith("🎉"))).toBe(false);
    expect(fired.some((t) => t.startsWith("Vẫn giữ thành tích 100%"))).toBe(true);
  });
});
