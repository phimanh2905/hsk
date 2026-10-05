import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import type { VocabRow } from "@/lib/my-vocab";
import { STROKE_PATH_DATA } from "@/content/hanzi-strokes";
import { WordDrawer } from "../word-drawer";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

const row: VocabRow = {
  zh: "徘徊", py: "páihuái", hv: "BỒI HỒI", vi: "Đi đi lại lại (bồi hồi)", hsk: "HSK 5",
  status: "study", last: "Ôn 2 ngày trước", star: false, note: "", hasSrs: true, deckIds: [],
};

afterEach(() => { cleanup(); speakMock.mockClear(); });

describe("WordDrawer", () => {
  it("glyph/py/hv/mean/meta + status pill + speak phát zh", () => {
    const { getByLabelText } = render(
      <WordDrawer row={row} onClose={() => {}} onStar={() => {}} onSaveNote={() => {}} onPractice={() => {}} />,
    );
    expect(document.body.textContent).toContain("Đang ôn");
    expect(document.body.textContent).toContain("徘徊");
    expect(document.body.textContent).toContain("BỒI HỒI");
    expect(document.body.textContent).toContain("HSK 5");
    expect(document.body.textContent).toContain("Ôn 2 ngày trước");
    act(() => getByLabelText("Phát âm").click());
    expect(speakMock).toHaveBeenCalledWith("徘徊", { rate: 0.85 });
  });
  it("strokes: chữ có data (爱) → tên nét từ STROKE_PATH_DATA; chữ lạ → fallback mock", () => {
    const { rerender, container } = render(
      <WordDrawer row={{ ...row, zh: "爱好" }} onClose={() => {}} onStar={() => {}} onSaveNote={() => {}} onPractice={() => {}} />,
    );
    const first = STROKE_PATH_DATA["爱"].order[0];
    expect(document.body.textContent).toContain(first[0]);
    expect(container.querySelector('[data-od-id="stroke-order"] ol')!.children.length)
      .toBe(STROKE_PATH_DATA["爱"].order.length);
    rerender(<WordDrawer row={{ ...row, zh: "徘徊" }} onClose={() => {}} onStar={() => {}} onSaveNote={() => {}} onPractice={() => {}} />);
    expect(document.body.textContent).toContain("Tra bút thuận trong Hanzi Studio");
  });
  it("tianzi: ký tự đầu + 'Mở Bàn luyện viết' link /hanzi", () => {
    const { getByText } = render(
      <WordDrawer row={row} onClose={() => {}} onStar={() => {}} onSaveNote={() => {}} onPractice={() => {}} />,
    );
    expect(getByOD("stroke-preview").querySelector("span")!.textContent).toBe("徘");
    expect(getByText("Mở Bàn luyện viết").getAttribute("href")).toBe("/hanzi");
  });
  it("star: aria-pressed theo row.star; click → onStar(zh)", () => {
    const onStar = vi.fn();
    const { getByLabelText, rerender } = render(
      <WordDrawer row={row} onClose={() => {}} onStar={onStar} onSaveNote={() => {}} onPractice={() => {}} />,
    );
    const btn = getByLabelText("Đánh dấu sao");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    act(() => btn.click());
    expect(onStar).toHaveBeenCalledWith("徘徊");
    rerender(<WordDrawer row={{ ...row, star: true }} onClose={() => {}} onStar={onStar} onSaveNote={() => {}} onPractice={() => {}} />);
    expect(getByLabelText("Bỏ gắn sao").getAttribute("aria-pressed")).toBe("true");
  });
  it("ghi chú: edit + Lưu ghi chú → onSaveNote(zh, value)", () => {
    const onSaveNote = vi.fn();
    const { getByLabelText, getByText } = render(
      <WordDrawer row={row} onClose={() => {}} onStar={() => {}} onSaveNote={onSaveNote} onPractice={() => {}} />,
    );
    act(() => { fireEvent.change(getByLabelText("GHI CHÚ CÁ NHÂN"), { target: { value: "mẹo riêng" } }); });
    act(() => getByText("Lưu ghi chú").click());
    expect(onSaveNote).toHaveBeenCalledWith("徘徊", "mẹo riêng");
  });
  it("Luyện từ này → onPractice(zh); đóng → onClose", () => {
    const onPractice = vi.fn();
    const onClose = vi.fn();
    const { getByText, getByLabelText } = render(
      <WordDrawer row={row} onClose={onClose} onStar={() => {}} onSaveNote={() => {}} onPractice={onPractice} />,
    );
    act(() => getByText("Luyện từ này").click());
    expect(onPractice).toHaveBeenCalledWith("徘徊");
    act(() => getByLabelText("Đóng chi tiết").click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
