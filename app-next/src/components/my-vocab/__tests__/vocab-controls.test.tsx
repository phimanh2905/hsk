import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { VocabControls, VocabSeg } from "../vocab-controls";

afterEach(cleanup);

const base = {
  view: "decks" as const,
  onView: vi.fn(),
  hsk: "all",
  onHsk: vi.fn(),
  q: "",
  onQ: vi.fn(),
  onNewDeck: vi.fn(),
};

describe("VocabSeg", () => {
  it("aria-pressed + active class accent-soft; click → onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VocabSeg label="Chế độ xem" options={[{ key: "a" as const, label: "A" }, { key: "b" as const, label: "B" }]} value="a" onChange={onChange} />,
    );
    const btns = container.querySelectorAll("button");
    expect(btns[0].getAttribute("aria-pressed")).toBe("true");
    expect(btns[0].className).toContain("bg-rose-wash");
    act(() => btns[1].click());
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("VocabControls", () => {
  it("2 seg + nút '+ Tạo Deck mới' + search pill với kbd /", () => {
    const { getByText, getByLabelText } = render(<VocabControls {...base} />);
    expect(getByText("Bộ thẻ cá nhân (Decks)")).toBeTruthy();
    expect(getByText("Danh sách toàn bộ từ")).toBeTruthy();
    expect(getByText("+ Tạo Deck mới")).toBeTruthy();
    expect(document.body.textContent).toContain("CẤP ĐỘ");
    expect(getByLabelText("Tìm kiếm từ vựng")).toBeTruthy();
    expect(document.querySelector("kbd")!.textContent).toBe("/");
  });
  it("search gõ → onQ; new deck → onNewDeck; hsk seg đủ 9 lựa chọn", () => {
    const onQ = vi.fn();
    const onNewDeck = vi.fn();
    const { getByLabelText, getByText } = render(<VocabControls {...base} onQ={onQ} onNewDeck={onNewDeck} />);
    act(() => { fireEvent.change(getByLabelText("Tìm kiếm từ vựng"), { target: { value: "ai" } }); });
    expect(onQ).toHaveBeenCalledWith("ai");
    act(() => getByText("+ Tạo Deck mới").click());
    expect(onNewDeck).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[role="group"][aria-label="Lọc HSK"] button').length).toBe(8);
  });
});
