import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { DeckModal } from "../deck-modal";

afterEach(cleanup);

describe("DeckModal", () => {
  it("input tên + Hủy/Tạo deck; Enter submit", () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();
    const { getByLabelText, getByText } = render(
      <DeckModal open onClose={onClose} onCreate={onCreate} />,
    );
    expect(document.body.textContent).toContain("Tạo Deck mới");
    const input = getByLabelText("Tên deck");
    act(() => { fireEvent.change(input, { target: { value: "Từ vựng phỏng vấn" } }); });
    act(() => { fireEvent.keyDown(input, { key: "Enter" }); });
    expect(onCreate).toHaveBeenCalledWith("Từ vựng phỏng vấn");
    act(() => getByText("Hủy").click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("đóng → input reset cho lần mở sau", () => {
    const { getByLabelText, rerender } = render(
      <DeckModal open onClose={() => {}} onCreate={() => {}} />,
    );
    const input = getByLabelText("Tên deck") as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "abc" } }); });
    rerender(<DeckModal open={false} onClose={() => {}} onCreate={() => {}} />);
    rerender(<DeckModal open onClose={() => {}} onCreate={() => {}} />);
    expect((getByLabelText("Tên deck") as HTMLInputElement).value).toBe("");
  });
});
