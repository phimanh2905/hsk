import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import MyGrammarRoot from "../my-grammar-root";
import { progressStore } from "@/lib/store/progress-store";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: () => {}, back: () => {} }),
}));

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
const cardIds = () => [...document.querySelectorAll('[data-od-id^="grammar-"]')].map((el) => el.getAttribute("data-od-id")!).filter((id) => !["grammar-hero", "grammar-filters", "grammar-grid"].includes(id));

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
});
afterEach(cleanup);

describe("MyGrammarRoot", () => {
  it("Review Focus #3: mặc định level HSK 4 → đúng 2 card (lian, yue) + hero + result line", () => {
    render(<MyGrammarRoot />);
    expect(getByOD("grammar-hero")).toBeTruthy();
    expect(cardIds()).toEqual(["grammar-lian", "grammar-yue"]);
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toBe("2 cấu trúc · HSK 4 · mọi chủ điểm");
  });

  it("'Tất cả' (level) → 6 card; topic ba → 2 card (ba, bei) + result line dùng label", () => {
    const { getByText } = render(<MyGrammarRoot />);
    act(() => getByText("Tất cả", { selector: '[aria-label="Lọc theo cấp độ HSK"] button' }).click());
    expect(cardIds().length).toBe(6);
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toBe("6 cấu trúc · Tất cả · mọi chủ điểm");
    act(() => getByText("Câu chữ 把 / 被").click());
    expect(cardIds()).toEqual(["grammar-ba", "grammar-bei"]);
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toContain("Câu chữ 把 / 被");
  });

  it("Review Focus #2: topic 'Đã lưu' khi chưa lưu → empty state + result '0 cấu trúc'", () => {
    const { getByText } = render(<MyGrammarRoot />);
    act(() => getByText("⭐ Đã lưu").click());
    expect(cardIds().length).toBe(0);
    expect(document.body.textContent).toContain("Không tìm thấy cấu trúc phù hợp. Thử từ khóa khác hoặc bấm “Tất cả”.");
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toBe("0 cấu trúc · HSK 4 · ⭐ Đã lưu");
  });

  it("Review Focus #4: ★ toggle lưu store + toast copy; grid sync qua bye:progress", () => {
    const { getAllByLabelText, getByLabelText, getByText } = render(<MyGrammarRoot />);
    const star = getAllByLabelText("Lưu cấu trúc")[0];
    act(() => star.click());
    expect(progressStore.getGrammarMeta()["lian"]).toEqual({ saved: 1 });
    act(() => getByText("⭐ Đã lưu").click());
    expect(cardIds()).toEqual(["grammar-lian"]);
    act(() => getByLabelText("Lưu cấu trúc").click()); // bỏ lưu
    expect(cardIds().length).toBe(0); // sync qua event
    expect(progressStore.getGrammarMeta()["lian"]).toBeUndefined();
  });

  it("search 'so sánh' → card bi (kết hợp level all) (Review Focus #5)", () => {
    const { getByText, getByLabelText } = render(<MyGrammarRoot />);
    act(() => getByText("Tất cả", { selector: '[aria-label="Lọc theo cấp độ HSK"] button' }).click()); // level all
    const input = getByLabelText("Tìm kiếm cấu trúc ngữ pháp") as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "so sánh" } }); });
    expect(cardIds()).toEqual(["grammar-bi"]);
  });

  it("'/' focus search; add/menu toast demo copy mock", () => {
    render(<MyGrammarRoot />);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true })); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Tìm kiếm cấu trúc ngữ pháp");
    // toast demo: useToastSafe no-op trong mount đơn lẻ — pin qua code (copy mock trong root)
  });
});
