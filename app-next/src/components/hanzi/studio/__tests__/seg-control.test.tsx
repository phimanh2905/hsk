// app-next/src/components/hanzi/studio/__tests__/seg-control.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SegControl } from "../seg-control";

afterEach(cleanup);

const TABS = [
  { key: "a" as const, label: "Tab A" },
  { key: "b" as const, label: "Tab B" },
];

describe("SegControl", () => {
  it("aria-pressed theo value; label → aria-label group", () => {
    const { container } = render(
      <SegControl label="Nhóm" tabs={TABS} value="b" onChange={() => {}} />
    );
    const group = container.querySelector('[role="group"][aria-label="Nhóm"]')!;
    const btns = group.querySelectorAll("button");
    expect(btns[0].getAttribute("aria-pressed")).toBe("false");
    expect(btns[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("click → onChange với key đúng", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegControl label="Nhóm" tabs={TABS} value="a" onChange={onChange} />
    );
    act(() => { container.querySelectorAll("button")[1].click(); });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("radius=2xl → rounded-2xl (speed-seg mock); mặc định rounded-xl", () => {
    const { container } = render(
      <SegControl label="N" tabs={TABS} value="a" onChange={() => {}} radius="2xl" />
    );
    expect(container.firstElementChild!.className).toContain("rounded-2xl");
  });
});
