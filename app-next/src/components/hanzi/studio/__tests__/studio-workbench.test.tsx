import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { STUDIO_CHARS } from "@/content/hanzi-studio";
import { StudioWorkbench, type StudioGridApi } from "../studio-workbench";

const AI = STUDIO_CHARS.find((c) => c.ch === "爱")!;

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioWorkbench>[0]> = {}) => {
  const apiRef = createRef<StudioGridApi>();
  const utils = render(
    <StudioWorkbench char={AI} mode="watch" onMode={() => {}} apiRef={apiRef} {...over} />,
  );
  return { ...utils, apiRef, getByODId };
};

describe("StudioWorkbench", () => {
  it("wb-head: glyph, pinyin, nghĩa; nút loa speak(ch+ch) rate 0.85", () => {
    const { getByLabelText } = setup();
    expect(getByODId("workbench").textContent).toContain("ài");
    expect(getByODId("workbench").textContent).toContain("Yêu, thích, quý trọng");
    act(() => getByLabelText("Phát âm").click());
    expect(speakMock).toHaveBeenCalledWith("爱爱", { rate: 0.85 });
  });

  it("watch mode: watchBar hiện, drawBar ẩn, meter ẩn", () => {
    const { getByODId } = setup({ mode: "watch" });
    expect(getByODId("watch-controls").className).not.toContain("hidden");
    expect(getByODId("draw-controls").className).toContain("hidden");
    expect(document.querySelector('[data-od-id="accuracy-meter"]')).toBeNull();
  });

  it("draw mode: drawBar hiện + meter hiện 'Độ chuẩn xác: — · Nét 0/10'", () => {
    const { getByODId } = setup({ mode: "draw" });
    expect(getByODId("draw-controls").className).not.toContain("hidden");
    expect(getByODId("accuracy-meter").textContent).toContain("Độ chuẩn xác: — · Nét 0/10");
  });

  it("mode tabs: click 'Tự luyện viết' → onMode('draw')", () => {
    const onMode = vi.fn();
    const { getByText } = setup({ onMode });
    act(() => getByText("Tự luyện viết (chấm điểm)").click());
    expect(onMode).toHaveBeenCalledWith("draw");
  });

  it("speed seg: click 1.5x → api.setSpeed (qua grid)", () => {
    const { getByText } = setup();
    act(() => getByText("1.5x").click());
    // asserted gián tiếp: không văng; wiring api→grid được pin ở studio-grid test
    expect(getByText("1.5x").getAttribute("aria-pressed")).toBe("true");
  });

  it("chips: bộ thủ (Hán jade), cấu trúc, Hán-Việt; mẹo nhớ", () => {
    const { getByODId } = setup();
    const meta = getByODId("char-meta");
    expect(meta.textContent).toContain("BỘ THỦ");
    expect(meta.querySelector(".text-learning-mastered")!.textContent).toBe("爫");
    expect(meta.textContent).toContain("Trên – Giữa – Dưới");
    expect(meta.textContent).toContain("ÁI");
    expect(getByODId("mnemonic").textContent).toContain("móng vuốt");
  });
});
