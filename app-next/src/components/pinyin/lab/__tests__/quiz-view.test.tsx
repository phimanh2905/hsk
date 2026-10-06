// app-next/src/components/pinyin/lab/__tests__/quiz-view.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { buildPool } from "@/lib/pinyin/quiz-engine";
import { PINYIN_LAB_DESC } from "@/content/pinyin-lab";
import { QuizView } from "../quiz-view";

const pool = buildPool();
const target = pool.find((p) => p.py === "bà")!;
const opts = [pool[0], pool[1], pool[2], target];

const base = {
  qi: 0, total: 10, score: 0, streak: 0, done: false,
  opts, target, picked: null as number | null, playing: false,
  onChoose: vi.fn(), onNext: vi.fn(), onReplay: vi.fn(), onSlow: vi.fn(), onReset: vi.fn(),
};

afterEach(cleanup);

describe("QuizView", () => {
  it("head: 'Câu 1 / 10', 'Độ chính xác: —', streak; chưa trả lời → next disabled", () => {
    const { getByText } = render(<QuizView {...base} />);
    expect(getByText("Câu 1 / 10")).toBeTruthy();
    expect(getByText("Độ chính xác: —")).toBeTruthy();
    expect(document.body.textContent).toContain("Chuỗi đúng:");
    expect((getByText("Chọn một đáp án để kiểm tra") as HTMLButtonElement).disabled).toBe(true);
  });

  it("4 option key A–D; click → onChoose(i)", () => {
    const onChoose = vi.fn();
    const { container } = render(<QuizView {...base} onChoose={onChoose} />);
    const optionBtns = container.querySelectorAll("[data-opt]");
    expect(optionBtns.length).toBe(4);
    expect(optionBtns[0].textContent).toContain("A");
    act(() => (optionBtns[2] as HTMLElement).click());
    expect(onChoose).toHaveBeenCalledWith(2);
  });

  it("picked sai: opt good/bad + feedback 'Chưa đúng.' + next 'Câu tiếp theo (Enter)'", () => {
    const { getByText, container } = render(<QuizView {...base} picked={0} qi={1} score={0} streak={0} />);
    expect(container.querySelector("[data-opt='3']")!.className).toContain("good"); // đáp án đúng idx 3
    expect(container.querySelector("[data-opt='0']")!.className).toContain("bad");
    expect(document.body.textContent).toContain("Chưa đúng.");
    expect(document.body.textContent).toContain("Đáp án là");
    expect(getByText("Câu tiếp theo (Enter)")).toBeTruthy();
  });

  it("đáp án đúng: feedback 'Chính xác!' kèm DESC của âm", () => {
    render(<QuizView {...base} picked={3} qi={1} score={1} streak={1} />);
    expect(document.body.textContent).toContain("Chính xác!");
    expect(document.body.textContent).toContain(PINYIN_LAB_DESC.b);
  });

  it("done: tổng kết đúng tier + primary 'Chơi phiên mới' → onNext; reset × → onReset", () => {
    const onNext = vi.fn();
    const onReset = vi.fn();
    const { getByText, getByLabelText } = render(
      <QuizView {...base} done qi={10} score={9} opts={[]} target={null} onNext={onNext} onReset={onReset} />,
    );
    expect(document.body.textContent).toContain("Hoàn thành phiên!");
    expect(document.body.textContent).toContain("Đúng 9/10 (90%)");
    expect(document.body.textContent).toContain("Tai nghe rất thính!"); // tier score >= 8
    act(() => getByText("Chơi phiên mới (Enter)").click());
    expect(onNext).toHaveBeenCalledTimes(1);
    act(() => getByLabelText("Chơi lại phiên mới").click());
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("emit/slow gọi đúng callbacks", () => {
    const onReplay = vi.fn();
    const onSlow = vi.fn();
    const { getByLabelText, getByText } = render(<QuizView {...base} onReplay={onReplay} onSlow={onSlow} />);
    act(() => getByLabelText("Nghe âm thanh").click());
    expect(onReplay).toHaveBeenCalledTimes(1);
    act(() => getByText("Nghe chậm 0.8x").click());
    expect(onSlow).toHaveBeenCalledTimes(1);
  });
});
