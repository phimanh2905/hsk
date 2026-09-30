import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, useLesson } from "../lesson-provider";
import type { LessonItem } from "../lesson-provider";

const items: LessonItem[] = [
  { hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
    example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0" },
];

function Probe() {
  const { mode, setMode, index, setIndex, known, markKnown } = useLesson();
  return (
    <div>
      <span data-mode={mode} data-index={index} />
      <button onClick={() => setMode("quiz")}>to-quiz</button>
      <button onClick={() => setIndex(1)}>next</button>
      <button onClick={() => markKnown(0, "known")}>known</button>
      <span data-known={known[0] ?? "none"} />
    </div>
  );
}

describe("LessonProvider state machine", () => {
  it("mode mặc định flash, setMode/setIndex/markKnown cập nhật", () => {
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-1">
        <Probe />
      </LessonProvider>
    );
    expect(container.querySelector("[data-mode='flash']")).toBeTruthy(); // mode mặc định
    act(() => screen.getByText("to-quiz").click());
    expect(container.querySelector("[data-mode='quiz']")).toBeTruthy();
    act(() => screen.getByText("next").click());
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    act(() => screen.getByText("known").click());
    expect(container.querySelector("[data-known='known']")).toBeTruthy();
  });

  it("useLesson throw nếu dùng ngoài provider", () => {
    // excerpt qua console.error do React báo lỗi render
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow();
    spy.mockRestore();
  });
});
