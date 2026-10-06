import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WordPopup } from "../word-popup";
import type { ReadingWord } from "@/content/reading";

const word: ReadingWord = {
  z: "宁静",
  p: "níngjìng",
  h: "ninh tĩnh",
  m: "yên tĩnh, tĩnh lặng",
};

const rect = new DOMRect(100, 200, 40, 30);

function setup(overrides: Partial<Parameters<typeof WordPopup>[0]> = {}) {
  const onClose = vi.fn();
  const onSpeak = vi.fn();
  const onSave = vi.fn();
  render(
    <WordPopup
      word={word}
      anchorRect={rect}
      onClose={onClose}
      onSpeak={onSpeak}
      onSave={onSave}
      saved={false}
      {...overrides}
    />,
  );
  return { onClose, onSpeak, onSave };
}

describe("WordPopup", () => {
  it("hiện z / p · h / m", () => {
    setup();
    expect(screen.getByText("宁静")).toBeTruthy();
    expect(screen.getByText("níngjìng · ninh tĩnh")).toBeTruthy();
    expect(screen.getByText("yên tĩnh, tĩnh lặng")).toBeTruthy();
  });

  it("click Nghe → onSpeak(word)", async () => {
    const user = userEvent.setup();
    const { onSpeak } = setup();
    await user.click(screen.getByRole("button", { name: "Nghe" }));
    expect(onSpeak).toHaveBeenCalledWith(word);
  });

  it("click Lưu từ → onSave(word)", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByRole("button", { name: "Lưu từ" }));
    expect(onSave).toHaveBeenCalledWith(word);
  });

  it("saved=true → nút disabled, nhãn 'Đã lưu', không gọi onSave nữa", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({ saved: true });
    const btn = screen.getByRole("button", { name: "Đã lưu" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    await user.click(btn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Escape → onClose", () => {
    const { onClose } = setup();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("click ngoài popup (overlay) → onClose", () => {
    const { onClose } = setup();
    // click vào overlay (nền fixed inset-0) — target ngoài panel
    const overlay = screen.getByText("宁静").closest("[data-od-id='word-popup']")!.parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
