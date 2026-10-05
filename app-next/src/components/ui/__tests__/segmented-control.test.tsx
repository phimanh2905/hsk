// app-next/src/components/ui/__tests__/segmented-control.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SegmentedControl } from "../segmented-control";

afterEach(cleanup);

const TABS = [
  { key: "a" as const, label: "Tab A" },
  { key: "b" as const, label: "Tab B" },
];

describe("SegmentedControl", () => {
  it("aria-pressed theo value; label → aria-label", () => {
    const { container } = render(<SegmentedControl label="Nhóm" tabs={TABS} value="b" onChange={() => {}} />);
    const group = container.querySelector('[role="group"][aria-label="Nhóm"]')!;
    const btns = group.querySelectorAll("button");
    expect(btns[0].getAttribute("aria-pressed")).toBe("false");
    expect(btns[1].getAttribute("aria-pressed")).toBe("true");
  });
  it("click → onChange(key)", () => {
    const onChange = vi.fn();
    const { container } = render(<SegmentedControl label="N" tabs={TABS} value="a" onChange={onChange} />);
    act(() => { container.querySelectorAll("button")[1].click(); });
    expect(onChange).toHaveBeenCalledWith("b");
  });
  it("radius 2xl/xl đặt class bo đúng", () => {
    const { container, rerender } = render(
      <SegmentedControl label="N" tabs={TABS} value="a" onChange={() => {}} radius="2xl" />,
    );
    expect(container.firstElementChild!.className).toContain("rounded-2xl");
    rerender(<SegmentedControl label="N" tabs={TABS} value="a" onChange={() => {}} />);
    expect(container.firstElementChild!.className).toContain("rounded-xl");
  });
});
