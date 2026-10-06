// app-next/src/components/pinyin/lab/__tests__/tone-lab.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { ToneLab } from "../tone-lab";
import { SandhiRules } from "../sandhi-rules";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

afterEach(() => { cleanup(); speakMock.mockClear(); });

describe("ToneLab", () => {
  it("4 card đúng tên + ví dụ; 4 contour svg riêng biệt", () => {
    const { container } = render(<ToneLab />);
    expect(getByODId("tone-lab").textContent).toContain("Thanh 1 (55)");
    expect(getByODId("tone-lab").textContent).toContain("mā");
    expect(getByODId("tone-lab").textContent).toContain("妈 · Mẹ");
    const contours = container.querySelectorAll('svg[viewBox="0 0 120 44"]'); // bỏ qua svg icon
    expect(contours.length).toBe(4);
    expect(contours[2].querySelector("polyline")).not.toBeNull(); // thanh 3: dip
  });
  it("speaker: speak(py) rate 0.95", () => {
    const { getByLabelText } = render(<ToneLab />);
    act(() => getByLabelText("Nghe mā").click());
    expect(speakMock).toHaveBeenCalledWith("mā", { rate: 0.95 });
  });
});

describe("SandhiRules", () => {
  it("3 rule; ví dụ bấm → onSpeak(py)", () => {
    const onSpeak = vi.fn();
    const { getByText } = render(<SandhiRules onSpeak={onSpeak} />);
    expect(document.querySelectorAll("[data-rule]").length).toBe(3);
    act(() => getByText("yídìng", { exact: false }).click());
    expect(onSpeak).toHaveBeenCalledWith("yídìng");
  });
});
