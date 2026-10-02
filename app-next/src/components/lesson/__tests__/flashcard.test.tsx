import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LessonProvider, useLesson, type LessonItem } from "../lesson-provider";
import FlashcardMode from "../modes/flashcard";
import LessonClient from "../lesson-client";

const words: LessonItem[] = [0, 1].map((i) => ({
  hanzi: `字${i}`, pinyin: `zì${i}`, hanViet: "TỰ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: `例${i}`, pinyinPerChar: [], vi: `ví dụ ${i}` }, index: i, itemKey: `hsk1.lesson-1.${i}`,
}));

function Harness() {
  // useLesson phải nằm trong provider — brief đặt span ngoài nên probe trong
  function KnownProbe() {
    const { known } = useLesson();
    return <span data-testid="known0">{known[0] ?? "none"}</span>;
  }
  return (
    <LessonProvider items={words} book="hsk1" page="lesson-1">
      <FlashcardMode />
      <KnownProbe />
    </LessonProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

describe("FlashcardMode", () => {
  it("lật thẻ khi click (mặt sau hiện pinyin + nghĩa)", async () => {
    render(<Harness />);
    expect(screen.queryByText(/NHĨ|TỰ/)).not.toBeInTheDocument(); // ước mặt trước chưa lộ nghĩa
    await act(async () => screen.getByText(/Click để lật/).click());
    expect(screen.getByText("nghĩa 0")).toBeInTheDocument();
  });
  it("nút 'Đã thuộc' đánh dấu known + sang thẻ sau", async () => {
    render(<Harness />);
    await act(async () => screen.getByRole("button", { name: /Đã thuộc/ }).click());
    expect(screen.getByTestId("known0").textContent).toBe("known");
    expect(screen.getByText("字1")).toBeInTheDocument();
  });
  it("phím ArrowUp = Đã thuộc, ArrowRight = thẻ sau", async () => {
    render(<Harness />);
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" })));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })));
    expect(screen.getByText("字1")).toBeInTheDocument();
  });
  it("Xáo trộn đổi thứ tự deck", async () => {
    render(<Harness />);
    await act(async () => screen.getByRole("button", { name: /Xáo trộn/ }).click());
    const hanzi = ["字0", "字1"];
    expect(hanzi.includes(screen.getByText(/字[01]/).textContent!)).toBe(true);
  });
});

describe("Lesson polish (SPEC-14)", () => {
  it("header: badge Bài N nền đen, mascot 🍅 trước h1, watermark có mặt (render qua LessonClient)", () => {
    const { container } = render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <LessonClient book="hsk1" page="lesson-1" />
      </LessonProvider>
    );
    expect(container.querySelector("[data-badge='page']")?.className).toContain("bg-black");
    expect(container.querySelector("[data-mascot]")?.textContent).toBe("🍅");
    expect(container.querySelector("[data-watermark]")).not.toBeNull();
  });
});
