// app-next/src/components/pinyin/lab/__tests__/sound-matrix.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SoundMatrix } from "../sound-matrix";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof SoundMatrix>[0]> = {}) =>
  render(<SoundMatrix cat="ini" art="all" sel="b" onSel={() => {}} onSpeak={() => {}} {...over} />);

describe("SoundMatrix — thanh mẫu", () => {
  it("đủ 23 icard theo 7 nhóm; ô b active; small là [BASE]", () => {
    const { container } = setup();
    expect(container.querySelectorAll("[data-ini]").length).toBe(23);
    expect(container.querySelectorAll("[data-group]").length).toBe(7);
    const b = container.querySelector('[data-ini="b"]')!;
    expect(b.className).toContain("border-action-primary");
    expect(b.textContent).toContain("[bō]");
  });
  it("art lọc: palatal → chỉ j q x (w/y biến mất khi art != all)", () => {
    const { container } = setup({ art: "palatal" });
    const cards = [...container.querySelectorAll("[data-ini]")].map((el) => el.getAttribute("data-ini"));
    expect(cards).toEqual(["j", "q", "x"]);
  });
  it("heading nhóm chỉ hiện khi có item; bấm ô → onSel(ch)", () => {
    const onSel = vi.fn();
    const { container } = setup({ art: "velar", onSel });
    expect(container.querySelectorAll("[data-group]").length).toBe(1);
    act(() => (container.querySelector('[data-ini="g"]') as HTMLElement).click());
    expect(onSel).toHaveBeenCalledWith("g");
  });
});

describe("SoundMatrix — vận mẫu", () => {
  it("36 icard theo 4 nhóm; bấm → onSpeak(Hán đầu của ex)", () => {
    const onSpeak = vi.fn();
    const { container } = setup({ cat: "fin", art: "all", onSpeak });
    expect(container.querySelectorAll("[data-fin]").length).toBe(36);
    expect(container.querySelectorAll("[data-group]").length).toBe(4);
    act(() => (container.querySelector('[data-fin="ai"]') as HTMLElement).click());
    expect(onSpeak).toHaveBeenCalledWith("爱"); // mock: speak(ex.split(" ")[0])
  });
  it("art lọc nhóm: simple → chỉ nhóm Đơn (7 ô)", () => {
    const { container } = setup({ cat: "fin", art: "simple" });
    expect(container.querySelectorAll("[data-fin]").length).toBe(7);
  });
});
