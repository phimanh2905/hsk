import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { SrsSession } from "../srs-session";
import type { ReviewableWord } from "@/lib/srs-session";

afterEach(cleanup);

beforeEach(() => {
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

function word(key: string, zh: string): ReviewableWord {
  return { key, zh, pinyin: "p", meaning: "m", level: "HSK 1", mem: 40, lastLabel: "Chưa ôn", isNew: true };
}

const words = [word("k1", "爱"), word("k2", "好"), word("k3", "你")];

describe("SrsSession", () => {
  it("render dialog + glyph; chưa reveal thì py/mean ẩn, nút grade ẩn", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector("[data-testid='sess-glyph']")!.textContent).toBe("爱");
    expect(container.querySelector("[data-testid='sess-py']")!.className).toContain("hidden");
    expect(container.querySelector("[data-testid='sess-grades']")!.className).toContain("hidden");
    expect(container.textContent).toContain("Từ 1 / 3");
  });
  it("click card / Space → reveal; Space lần nữa → phát âm lại (không đổi state)", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    expect(container.querySelector("[data-testid='sess-py']")!.className).not.toContain("hidden");
    expect(container.querySelector("[data-testid='sess-grades']")!.className).not.toContain("hidden");
    act(() => { fireEvent.keyDown(window, { code: "Space" }); });
    expect(container.querySelector("[data-testid='sess-grades']")!.className).not.toContain("hidden"); // vẫn reveal
  });
  it("grade qua phím 1/2/3 + click: điểm tăng khi nhớ, hết hàng → onExit(score,total)", () => {
    const onGrade = vi.fn();
    const onExit = vi.fn();
    const { container } = render(<SrsSession words={words} onGrade={onGrade} onExit={onExit} />);
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); }); // nhớ → 1 điểm, sang thẻ 2
    expect(onGrade).toHaveBeenLastCalledWith("k1", "good");
    expect(container.querySelector("[data-testid='sess-glyph']")!.textContent).toBe("好");
    expect(container.textContent).toContain("1 nhớ");
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "1" }); }); // quên → 0 điểm thêm
    expect(onGrade).toHaveBeenLastCalledWith("k2", "forgot");
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    expect(onExit).toHaveBeenCalledWith(2, 3);
  });
  it("grade chưa reveal → bỏ qua", () => {
    const onGrade = vi.fn();
    render(<SrsSession words={words} onGrade={onGrade} onExit={() => {}} />);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    expect(onGrade).not.toHaveBeenCalled();
  });
  it("Escape → onExit; click nút thoát → onExit", () => {
    const onExit = vi.fn();
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={onExit} />);
    act(() => { fireEvent.keyDown(window, { key: "Escape" }); });
    expect(onExit).toHaveBeenCalledWith(0, 3);
    onExit.mockClear();
    fireEvent.click(container.querySelector("[aria-label='Thoát phiên ôn tập']")!);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
  it("progress label + track width theo idx", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    expect(container.textContent).toContain("0 nhớ");
    const fill = container.querySelector("[data-testid='sess-fill']") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });
});
