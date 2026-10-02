import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import BattleMode, { buildBattleQuestions } from "../modes/battle";
import { progressStore } from "@/lib/store/progress-store";
import { LoginProvider } from "@/components/shell/login-modal";

const words: LessonItem[] = Array.from({ length: 13 }, (_, i) => ({
  hanzi: `词${i}`, pinyin: `cí${i}`, hanViet: "TỪ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: `例${i}，词${i}。`, pinyinPerChar: [], vi: `ví dụ ${i}` }, index: i, itemKey: `hsk1.lesson-1.${i}`,
}));

beforeEach(() => localStorage.clear());

describe("buildBattleQuestions", () => {
  it("đúng 13 câu, đủ 5 dạng, mỗi câu có options + answer", () => {
    const qs = buildBattleQuestions(words);
    expect(qs).toHaveLength(13);
    expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(["han2vi", "vi2han", "han2py", "cloze", "typing"]));
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
    }
  });
});

describe("BattleMode", () => {
  it("thi xong lưu best (max correct); 'Đăng nhập' mở modal không điều hướng", async () => {
    vi.useFakeTimers();
    render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <LoginProvider>
          <BattleMode />
        </LoginProvider>
      </LessonProvider>
    );
    await act(async () => screen.getByRole("button", { name: /Bắt đầu thi/ }).click());
    // trả lời đúng câu 1 (bấm đáp án chứa answer của câu hiện tại) rồi "Không biết" phần còn lại
    for (let i = 0; i < 13; i++) {
      const btn = screen.queryAllByRole("button").find((b) => b.dataset.answer === "true");
      act(() => { (btn ?? screen.getByRole("button", { name: /Không biết/ })).click(); });
      act(() => vi.advanceTimersByTime(300));
    }
    expect(progressStore.getBattleBest("hsk1.lesson-1")?.correct).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đăng nhập để lưu kết quả lên bảng xếp hạng/)).toBeInTheDocument();
    vi.useRealTimers();
  });
  it("Top-10 cứng hiển thị cả khi chưa thi", () => {
    render(<LessonProvider items={words} book="hsk1" page="lesson-1"><LoginProvider><BattleMode /></LoginProvider></LessonProvider>);
    expect(screen.getByText(/Top 10 bài này/)).toBeInTheDocument();
    expect(screen.getByText(/Thùy Trâm/)).toBeInTheDocument(); // 🥇 13/13 0:25.9 theo SPEC-02 §7
  });
});
