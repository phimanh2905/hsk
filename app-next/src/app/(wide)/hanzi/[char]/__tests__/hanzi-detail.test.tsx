import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import HanziDetail from "../hanzi-detail";

vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });
beforeEach(() => {
  // canvas ctx cho DrawPad mount trong sidebar
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, fillText() {},
  } as unknown as CanvasRenderingContext2D);
});

describe("HanziDetail (G2 màn 2)", () => {
  it("你: title, metadata đầy đủ, vocab 2 sidebar, chữ sau", () => {
    render(<HanziDetail char="你" />);
    expect(screen.getByRole("heading", { name: "你 - NHĨ" })).toBeInTheDocument();
    expect(screen.getByText(/còn đọc: NỄ/)).toBeInTheDocument();
    expect(screen.getByText("Số nét:")).toBeInTheDocument();
    expect(screen.getByText("Cấu tạo từ:")).toBeInTheDocument();
    expect(screen.getByText("Từ vựng trong sách")).toBeInTheDocument();
    expect(screen.getByText("Từ vựng thực chiến")).toBeInTheDocument();
    expect(screen.getByText("Chữ sau 好 →")).toHaveAttribute("href", "/hanzi/" + encodeURIComponent("好"));
    expect(screen.getByText("→ Quy tắc chuyển âm")).toHaveAttribute("href", "/sound-rules");
  });
  it("7 nút animation toggle + 🔊 speak", () => {
    render(<HanziDetail char="你" />);
    act(() => screen.getByText("Xem lại thứ tự nét").click()); // play — không lỗi với rAF thật
    act(() => screen.getByText("Hiển thị hạt mũi tên").click());
    expect(screen.getByText("Hiển thị hạt mũi tên").getAttribute("aria-pressed")).toBe("true");
    act(() => screen.getByTitle("Phát âm 你").click());
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
  it("chữ không có data → fallback meaning verbatim", () => {
    render(<HanziDetail char="躯" />);
    expect(screen.getByText(/Chưa có dữ liệu chi tiết cho chữ này/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "躯 - —" })).toBeInTheDocument();
  });
});
