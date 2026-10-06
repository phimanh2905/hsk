import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import type { VocabRow } from "@/lib/my-vocab";
import { VocabTable } from "../vocab-table";

const row = (over: Partial<VocabRow>): VocabRow => ({
  zh: "徘徊", py: "páihuái", hv: "BỒI HỒI", vi: "Đi đi lại lại", hsk: "HSK 5",
  status: "study", last: "Ôn 2 ngày trước", star: true, note: "", hasSrs: true, deckIds: [],
  ...over,
});

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof VocabTable>[0]> = {}) =>
  render(<VocabTable rows={[row({})]} onOpen={() => {}} onSpeak={() => {}} {...over} />);

describe("VocabTable", () => {
  it("6 cột header đúng mock; row hiển thị đủ zh/py/hv/vi/hsk/mem", () => {
    const { container } = setup();
    const headers = [...container.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(headers).toEqual(["Hán tự", "Pinyin", "Âm Hán-Việt & Nghĩa", "HSK", "Trạng thái", "Thao tác"]);
    const tr = container.querySelector("tbody tr")!;
    expect(tr.querySelector("td.zh")!.textContent).toBe("徘徊");
    expect(tr.textContent).toContain("páihuái");
    expect(tr.textContent).toContain("BỒI HỒI");
    expect(tr.textContent).toContain("HSK 5");
    expect(tr.querySelector("b")!.textContent).toBe("3/5");
  });
  it("audio stopPropagation + onSpeak; click row → onOpen(zh)", () => {
    const onOpen = vi.fn();
    const onSpeak = vi.fn();
    const { container, getAllByLabelText } = setup({ onOpen, onSpeak });
    // cả bảng (≥720px) và mcard (<720px) đều trong DOM ở jsdom → lấy nút bảng đầu tiên
    act(() => getAllByLabelText("Nghe 徘徊")[0].click());
    expect(onSpeak).toHaveBeenCalledWith("徘徊");
    expect(onOpen).not.toHaveBeenCalled(); // stopPropagation
    act(() => (container.querySelector("tbody tr") as HTMLElement).click());
    expect(onOpen).toHaveBeenCalledWith("徘徊");
  });
  it("rỗng → empty state đúng copy", () => {
    setup({ rows: [] });
    expect(document.body.textContent).toContain("Không có từ nào khớp bộ lọc.");
  });
  it("mobile cards render cùng số row (cùng 1 hàm map)", () => {
    const { container } = setup({ rows: [row({}), row({ zh: "苹果", status: "master" })] });
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
    expect(container.querySelectorAll("[data-mcard]").length).toBe(2);
  });
});
