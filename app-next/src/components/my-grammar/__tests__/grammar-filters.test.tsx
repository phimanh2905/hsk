// app-next/src/components/my-grammar/__tests__/grammar-filters.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { GrammarFilters } from "../grammar-filters";

afterEach(cleanup);

const base = {
  level: "HSK 4", onLevel: vi.fn(), topic: "all", onTopic: vi.fn(),
  q: "", onQ: vi.fn(), onAdd: vi.fn(), result: "2 cấu trúc · HSK 4 · mọi chủ điểm",
};

describe("GrammarFilters", () => {
  it("level ribbon đủ 7 chip + '+ Thêm cấu trúc mới'; HSK 4 active", () => {
    const { getByText } = render(<GrammarFilters {...base} />);
    expect(document.querySelectorAll('[role="group"][aria-label="Lọc theo cấp độ HSK"] button').length).toBe(8); // 7 chip + add
    expect(getByText("HSK 4").getAttribute("aria-pressed")).toBe("true");
    expect(getByText("+ Thêm cấu trúc mới")).toBeTruthy();
  });
  it("topic ribbon đủ 6 chip theo GRAMMAR_TOPICS; onTopic/onLevel/onAdd gọi đúng", () => {
    const onTopic = vi.fn();
    const onAdd = vi.fn();
    const { getByText } = render(<GrammarFilters {...base} onTopic={onTopic} onAdd={onAdd} />);
    expect(document.querySelectorAll('[role="group"][aria-label="Lọc theo chủ điểm"] button').length).toBe(6);
    expect(getByText("Câu chữ 把 / 被")).toBeTruthy();
    // Global Constraint: Hán tự luôn kèm class zh — chip label chứa Hán phải có .zh
    expect(getByText("Câu chữ 把 / 被").className).toContain("zh");
    expect(getByText("⭐ Đã lưu")).toBeTruthy();
    act(() => getByText("Câu chữ 把 / 被").click());
    expect(onTopic).toHaveBeenCalledWith("ba");
    act(() => getByText("HSK 2").click());
    expect(base.onLevel).toHaveBeenCalledWith("HSK 2");
    act(() => getByText("+ Thêm cấu trúc mới").click());
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
  it("result line aria-live + search kbd /", () => {
    const { getByText, getByLabelText } = render(<GrammarFilters {...base} />);
    expect(getByText("2 cấu trúc · HSK 4 · mọi chủ điểm").getAttribute("aria-live")).toBe("polite");
    expect(getByLabelText("Tìm kiếm cấu trúc ngữ pháp")).toBeTruthy();
    expect(document.querySelector("kbd")!.textContent).toBe("/");
  });
  it("search gõ → onQ", () => {
    const onQ = vi.fn();
    const { getByLabelText } = render(<GrammarFilters {...base} onQ={onQ} />);
    act(() => { fireEvent.change(getByLabelText("Tìm kiếm cấu trúc ngữ pháp"), { target: { value: "把" } }); });
    expect(onQ).toHaveBeenCalledWith("把");
  });
});
