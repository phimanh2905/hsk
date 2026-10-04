import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziWriter from "hanzi-writer";
import { StrokeStudio } from "../stroke-studio";

vi.mock("hanzi-writer", () => ({
  default: { loadCharacterData: vi.fn() },
}));
const mockedLoad = vi.mocked(HanziWriter.loadCharacterData);

const FAKE = { strokes: ["M10,10 L100,100", "M50,50 L200,200"], medians: [] };

function stubSvg() {
  const w = window as unknown as Record<string, { prototype: Record<string, unknown> } | undefined>;
  if (!w.SVGPathElement) w.SVGPathElement = class {} as never;
  w.SVGPathElement!.prototype.getTotalLength = () => 100;
  if (!w.SVGSVGElement) w.SVGSVGElement = class {} as never;
  w.SVGSVGElement!.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300 }) as DOMRect;
}

describe("StrokeStudio (port [data-od-id=stroke-modal] của opendesign lesson.html)", () => {
  beforeEach(() => {
    localStorage.clear();
    stubSvg();
    mockedLoad.mockReset();
  });

  it("open=false → null; char-tabs chọn chữ với aria-pressed; render đủ path nét", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container, rerender } = render(
      <StrokeStudio open={false} onClose={vi.fn()} word="爱好" pinyin="àihào" />
    );
    expect(container.querySelector('[data-od-id="stroke-modal"]')).toBeNull();

    rerender(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    const tabs = screen.getByRole("group", { name: "Chọn chữ" });
    expect(tabs.querySelectorAll("button").length).toBe(2); // 爱 + 好 (unique)
    expect(tabs.querySelectorAll("button")[0].getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(container.querySelectorAll("path.hz-st").length).toBe(2));
    expect(screen.getByText("àihào")).toBeInTheDocument(); // py-pill fallback pinyin của từ
  });

  it("Review Focus 5: load data lỗi → nodata, không crash, nút điều khiển disabled", async () => {
    mockedLoad.mockRejectedValue(new Error("offline"));
    render(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    expect(await screen.findByText(/bổ sung dữ liệu bút thuận/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát lại" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nét trước" })).toBeDisabled();
  });

  it("autoplay khi có data: cả 2 nét chuyển done sau hoạt họa", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container } = render(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    await waitFor(
      () => expect(container.querySelectorAll("path.hz-st.done").length).toBe(2),
      { timeout: 3000 }
    );
  });

  it("Tự luyện viết: bật → vẽ nét pointer, đếm, hoàn tác, xóa hết", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container } = render(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    await waitFor(() => expect(container.querySelector("path.hz-st")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: /Tự luyện viết/ }));
    const ink = screen.getByLabelText("Bảng tự luyện viết");
    expect(ink).toBeVisible();
    fireEvent.pointerDown(ink, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(ink, { pointerId: 1, clientX: 60, clientY: 60 });
    fireEvent.pointerMove(ink, { pointerId: 1, clientX: 150, clientY: 90 });
    fireEvent.pointerUp(ink, { pointerId: 1 });
    expect(screen.getByText(/1 nét đã viết/)).toBeInTheDocument();
    expect(container.querySelectorAll("polyline.hz-ink-path").length).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(screen.getByText(/0 nét đã viết/)).toBeInTheDocument();
  });

  it("Escape → onClose", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const onClose = vi.fn();
    render(<StrokeStudio open onClose={onClose} word="爱" pinyin="ài" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Review Focus 1: đóng rồi mở lại ở từ khác → cur đồng bộ về chữ đầu (tab aria-pressed + load đúng chữ)", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { rerender } = render(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith("爱"));

    // đóng sheet (component vẫn mounted, chỉ return null) rồi mở lại ở từ khác
    rerender(<StrokeStudio open={false} onClose={vi.fn()} word="爱" pinyin="ài" />);
    expect(screen.queryByRole("group", { name: "Chọn chữ" })).toBeNull();
    rerender(<StrokeStudio open onClose={vi.fn()} word="音乐" pinyin="yīnyuè" />);

    const tabs = screen.getByRole("group", { name: "Chọn chữ" });
    // chữ đầu (音) phải được press — không còn đọng chữ 愛 của lần mở trước
    await waitFor(() =>
      expect(tabs.querySelectorAll("button")[0].getAttribute("aria-pressed")).toBe("true")
    );
    expect(screen.getByRole("button", { name: /音/ })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith("音"));
  });

  it("Review Focus 2: a11y focus — mở sheet focus nút đóng, đóng lại trả focus về trigger", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const trigger = document.createElement("button");
    trigger.textContent = "Mở bảng nét";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<StrokeStudio open={false} onClose={vi.fn()} word="爱" pinyin="ài" />);
    rerender(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Đóng bảng nét chữ" }));

    rerender(<StrokeStudio open={false} onClose={vi.fn()} word="爱" pinyin="ài" />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("mẹo ghi nhớ chỉ hiện với chữ có data TIPS", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    render(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    expect(await screen.findByText("MẸO GHI NHỚ")).toBeInTheDocument();
  });
});
