import { describe, expect, it, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { StudioWorkbench } from "../studio-workbench";
import type { StudioGridApi } from "../studio-grid";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

const rad = RADICAL_INDEX.find((r) => r.char === "水")!;
const mei = CHAR_META["没"];

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: vi.fn(), speaking: false }),
}));
/* grid tự load data nét (async) — mock để không fetch thật trong test workbench */
vi.mock("../writer-data", () => ({
  loadWriterCharData: vi.fn(async () => null),
  clearWriterDataCache: vi.fn(),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement | null;
}

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioWorkbench>[0]> = {}) => {
  const apiRef = createRef<StudioGridApi | null>();
  const utils = render(
    <StudioWorkbench
      data={{ kind: "rad", rad }}
      mode="watch"
      onMode={() => {}}
      apiRef={apiRef}
      hasStrokeData
      onSelectTray={() => {}}
      {...over}
    />,
  );
  return { ...utils, apiRef, getByODId };
};

describe("StudioWorkbench", () => {
  it("rad: header tên bộ + số nét + tray chữ", () => {
    const { getByODId } = setup();
    expect(getByODId("workbench")!.textContent).toContain("Thủy");
    expect(getByODId("workbench")!.textContent).toContain("4 nét");
    expect(getByODId("char-tray")).toBeTruthy();
    expect(
      document.querySelectorAll('[data-od-id="char-tray"] [data-tray]').length,
    ).toBeGreaterThan(0);
  });

  it("char: hiện hộp bóc tách (chứa glyph bộ) + chip active", () => {
    const { getByODId } = setup({ data: { kind: "char", meta: mei, rad } });
    const decomp = getByODId("decomp")!;
    expect(decomp.textContent).toContain("氵");
    expect(decomp.textContent).toContain("殳");
    const chip = document.querySelector('[data-od-id="char-tray"] [data-tray="没"]') as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.className).toContain("border-action-primary");
  });

  it("decomp lọc glyph bộ dạng từ điển (水) khỏi thành phần", () => {
    /* 冰: decomp [冫, 水] — 水 = rad.char → rest chỉ còn 冫 */
    const bing = CHAR_META["冰"];
    const { getByODId } = setup({ data: { kind: "char", meta: bing, rad } });
    const decomp = getByODId("decomp")!;
    /* rest không chứa 水 (glyph bộ bị lọc khỏi decomp), chỉ còn 冫 */
    expect(decomp.textContent).toBe("Bóc tách: Bộ 水 + 冫");
  });

  it("click tray chip → onSelectTray với chữ", async () => {
    const onSelectTray = vi.fn();
    const { } = setup({ onSelectTray });
    const chip = document.querySelector('[data-od-id="char-tray"] [data-tray="没"]') as HTMLElement;
    await act(async () => {
      await userEvent.click(chip);
    });
    expect(onSelectTray).toHaveBeenCalledWith("没");
  });

  it("loa: speak glyph rate 0.85; mode tabs gọi onMode", () => {
    const onMode = vi.fn();
    const { getByLabelText, getByText } = setup({ onMode });
    act(() => getByLabelText("Phát âm").click());
    expect(speakMock).toHaveBeenCalledWith("水", { rate: 0.85 });
    act(() => getByText("Tự luyện viết").click());
    expect(onMode).toHaveBeenCalledWith("draw");
  });

  it("speed seg chỉ 0.75x / 1.0x; watch/draw controls toggle; draw chỉ hint", () => {
    const { getByText, getByODId } = setup({ mode: "draw" });
    expect(getByText("0.75x")).toBeTruthy();
    expect(getByText("1.0x")).toBeTruthy();
    expect(() => getByText("1.5x")).toThrow();
    expect(getByODId("draw-controls")!.className).not.toContain("hidden");
    expect(getByODId("watch-controls")!.className).toContain("hidden");
    expect(getByText("Gợi ý nét mờ")).toBeTruthy();
    expect(document.querySelector('[data-od-id="accuracy-meter"]')).toBeNull();
    expect(document.querySelector('[data-od-id="char-meta"]')).toBeNull();
  });

  it("mẹo nhớ: rad dùng rad.meaning", () => {
    const { getByODId } = setup();
    expect(getByODId("mnemonic")!.textContent).toContain("Nước");
  });

  it("không có data nét → panel fallback, không grid, không controls", () => {
    const { container, getByText } = setup({ data: null, hasStrokeData: false });
    expect(container.querySelector('[data-od-id="tianzi-grid"]')).toBeNull();
    expect(container.querySelector('[data-od-id="watch-controls"]')).toBeNull();
    expect(container.querySelector('[data-od-id="char-tray"]')).toBeNull();
    expect(getByText(/Chưa có data nét/)).toBeTruthy();
  });
});
