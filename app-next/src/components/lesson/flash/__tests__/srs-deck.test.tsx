import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, useLesson } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import * as progressStoreMod from "@/lib/store/progress-store";
import { SrsDeck } from "../srs-deck";

const items: LessonItem[] = [
  { hanzi: "爱好", pinyin: "àihào", hanViet: "ÁI HẢO", meaning: "Sở thích", pos: "Danh từ",
    example: { zh: "我的爱好是看书。", pinyinPerChar: [], vi: "Sở thích của tôi là đọc sách." }, index: 0, itemKey: "hsk1.lesson-4.0" },
];

function Harness() {
  const { revealed, setRevealed } = useLesson();
  return (
    <div>
      <button onClick={() => setRevealed(!revealed)}>toggle</button>
      <SrsDeck />
    </div>
  );
}

function mount() {
  return render(
    <LessonProvider items={items} book="hsk1" page="lesson-4">
      <Harness />
    </LessonProvider>
  );
}

describe("SrsDeck (port [data-od-id=srs-deck] của opendesign lesson.html)", () => {
  it("chưa revealed: nút reveal 56px + kbd Space; click → setRevealed", async () => {
    const { container } = mount();
    const btn = screen.getByRole("button", { name: /Chạm để xem nghĩa & ví dụ/ });
    expect(btn.className).toContain("min-h-[56px]");
    expect(container.querySelector("kbd")).toBeInTheDocument();
    await userEvent.click(btn);
    // sau khi reveal, nút reveal biến mất, 3 nút grade hiện
    expect(screen.getByRole("button", { name: /Chưa thuộc/ })).toBeInTheDocument();
  });

  it("revealed: 3 nút grade đúng tone + hotkey badge + data-grade", () => {
    const { container } = mount();
    act(() => screen.getByText("toggle").click());
    const again = screen.getByRole("button", { name: /Chưa thuộc/ });
    expect(again.getAttribute("data-grade")).toBe("1");
    expect(again.getAttribute("data-od-id")).toBe("grade-again");
    expect(again.className).toContain("bg-rose-wash");
    expect(again.className).toContain("text-rose-ink");
    const hard = screen.getByRole("button", { name: /Mơ hồ · Khó/ });
    expect(hard.className).toContain("bg-amber-wash");
    expect(hard.getAttribute("data-grade")).toBe("2");
    const good = screen.getByRole("button", { name: /Đã thuộc · Tốt/ });
    expect(good.className).toContain("bg-action-primary");
    expect(good.getAttribute("data-grade")).toBe("3");
    expect(container.querySelectorAll("[data-grade]").length).toBe(3);
  });

  it("click grade 1 → recordReview key đúng", async () => {
    const spy = vi.spyOn(progressStoreMod.progressStore, "recordReview");
    mount();
    act(() => screen.getByText("toggle").click());
    await userEvent.click(screen.getByRole("button", { name: /Chưa thuộc/ }));
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-4.0", "forgot");
    spy.mockRestore();
  });
});
