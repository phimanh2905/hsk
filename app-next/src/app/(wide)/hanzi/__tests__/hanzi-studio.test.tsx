import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import HanziStudio, { clampPage } from "../hanzi-studio";

afterEach(cleanup);

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
const zcards = () => document.querySelectorAll("[data-od-id^='zcard-']");

describe("clampPage (Review Focus #1)", () => {
  it("kẹp về [1, pages]", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(1, 0)).toBe(1); // pages tối thiểu 1
  });
});

describe("HanziStudio", () => {
  it("mặc định level HSK 2 (theo mock) → 8 chữ, đang chọn 爱", () => {
    const { getByText } = render(<HanziStudio />);
    expect(zcards().length).toBe(8);
    expect(getByText("Trang 1 / 1 · 8 chữ mẫu")).toBeTruthy();
  });

  it("lọc cấp độ HSK 1 → 4 chữ 人 大 口 日", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 1").click());
    expect(zcards().length).toBe(4);
  });

  it("state pill 'Đã thuộc nét' + level HSK 2 → 1 chữ (心)", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => {
      getByText("HSK 2").click();
      getByText(/^Đã thuộc nét \(/).click();
    });
    expect(zcards().length).toBe(1);
    expect(document.querySelector("[data-od-id='zcard-心']")).not.toBeNull();
  });

  it("'Cần luyện lại' = mid + new (st !== done) — port ý nghĩa nhãn (spec §5)", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 2").click());
    act(() => getByText(/^Cần luyện lại \(/).click());
    // HSK 2: 爱 new, 好 mid, 国 new, 汉 mid, 书 new, 木 mid, 水 mid = 7
    expect(zcards().length).toBe(7);
  });

  it("search 'ai' → chỉ 爱 (substring trên ch+py+hv)", () => {
    const { container } = render(<HanziStudio />);
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "ai" } }); });
    expect(zcards().length).toBe(1);
    expect(container.querySelector("[data-od-id='zcard-爱']")).not.toBeNull();
  });

  it("search rác → empty state + count pills theo level", () => {
    const { getByText } = render(<HanziStudio />);
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "zzzz" } }); });
    expect(getByText("Không có chữ nào khớp bộ lọc.")).toBeTruthy();
  });

  it("chọn chữ: workbench đổi glyph + card active; desktop giữ pane catalog", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 1").click());
    act(() => getByODId("zcard-大").click());
    const wb = getByODId("workbench");
    expect(wb.querySelector(".zh")!.textContent).toBe("大");
    expect(getByODId("zcard-大").getAttribute("aria-pressed")).toBe("true");
    // jsdom innerWidth = 1024 → không chuyển pane: catalog vẫn hiện
    expect(getByODId("char-catalog").parentElement!.className).not.toContain("hidden");
  });

  it("mobile (<1024px): chọn chữ → pane chuyển sang work (catalog ẩn)", () => {
    const innerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    try {
      const { getByText } = render(<HanziStudio />);
      act(() => getByODId("zcard-好").click());
      const catalogWrap = getByODId("char-catalog").parentElement!;
      expect(catalogWrap.className).toContain("hidden");
      const workWrap = getByODId("workbench").parentElement!;
      expect(workWrap.className).not.toContain("hidden");
    } finally {
      if (innerWidth) Object.defineProperty(window, "innerWidth", innerWidth);
    }
  });
});
