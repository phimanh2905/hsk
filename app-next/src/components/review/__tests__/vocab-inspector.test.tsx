import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { VocabInspector } from "../vocab-inspector";
import type { ReviewableWord } from "@/lib/srs-session";

afterEach(cleanup);

function word(over: Partial<ReviewableWord>): ReviewableWord {
  return {
    key: "hsk1.lesson-1.0", zh: "爱", pinyin: "ài", meaning: "Yêu", level: "HSK 1",
    mem: 45, lastLabel: "2 ngày trước", isNew: false, ...over,
  };
}

const words = [
  word({ key: "k1", zh: "爱", pinyin: "ài", meaning: "Yêu", mem: 45 }),
  word({ key: "k2", zh: "苹果", pinyin: "píngguǒ", meaning: "Quả táo", mem: 68 }),
  word({ key: "k3", zh: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào", mem: 95, isNew: true }),
];

describe("VocabInspector", () => {
  it("bảng desktop: header 6 cột + hàng dữ liệu + membar + lần ôn cuối", () => {
    const { container } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    expect(container.textContent).toContain("Hán tự");
    expect(container.textContent).toContain("Độ bền trí nhớ");
    expect(container.textContent).toContain("Lần ôn cuối");
    expect(container.textContent).toContain("ài");
    expect(container.textContent).toContain("Quả táo");
    expect(container.textContent).toContain("2 ngày trước");
  });
  it("filter Cấp bách chỉ còn mem<55; Từ mới chỉ isNew", () => {
    const { container, getByText } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    fireEvent.click(getByText(/Cấp bách/));
    expect(container.textContent).toContain("Yêu");
    expect(container.textContent).not.toContain("Quả táo");
    fireEvent.click(getByText(/Từ mới/));
    expect(container.textContent).toContain("Xin chào");
    expect(container.textContent).not.toContain("Yêu");
  });
  it("search theo zh/pinyin/meaning; không khớp → empty state", () => {
    const { container } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    const input = container.querySelector("input[type='search']")!;
    fireEvent.change(input, { target: { value: "táo" } });
    expect(container.textContent).toContain("Quả táo");
    expect(container.textContent).not.toContain("Yêu");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(container.textContent).toContain("Không có từ nào khớp bộ lọc hiện tại.");
  });
  it("nút nghe/nét gọi callback với zh đúng", () => {
    const onListen = vi.fn(), onStroke = vi.fn();
    const { container } = render(<VocabInspector words={words} onListen={onListen} onStroke={onStroke} />);
    const row = container.querySelector("tbody tr")!;
    fireEvent.click(row.querySelector('[aria-label^="Nghe"]')!);
    expect(onListen).toHaveBeenCalledWith("爱");
    fireEvent.click(row.querySelector('[aria-label^="Xem nét viết"]')!);
    expect(onStroke).toHaveBeenCalledWith("爱");
  });
});
