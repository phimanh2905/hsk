import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import RadicalsClient from "../deck-client";
import AutoplayModal, { type AutoplayCfg } from "../autoplay-modal";
import StrokeRules from "../stroke-rules";

beforeEach(() => localStorage.clear());

describe("RadicalsClient (D3)", () => {
  it("deck 1/214, bấm thẻ grid nhảy deck tới thẻ đó", () => {
    render(<RadicalsClient />);
    expect(screen.getByText(/1 \/ 214/)).toBeInTheDocument();
    const cells = screen.getAllByRole("button", { name: /#/ });
    act(() => cells[1].click()); // bấm bộ #2
    expect(screen.getByText(/2 \/ 214/)).toBeInTheDocument();
  });
  it("modal autoplay: mặc định 3/2/tắt/1, select nghe lại disabled khi toggle tắt", () => {
    const cfgs: AutoplayCfg[] = [];
    render(<AutoplayModal onStart={(c) => cfgs.push(c)} onClose={() => {}} />);
    expect(screen.getByLabelText(/Thời gian lật thẻ/)).toHaveValue("3");
    expect(screen.getByLabelText(/Số lần nghe lại/)).toBeDisabled();
    act(() => screen.getByRole("button", { name: /Bắt đầu/ }).click());
    expect(cfgs[0]).toEqual({ flipSec: 3, nextSec: 2, speakOn: false, repeat: 1 });
  });
  it("7 quy tắc nét + card 3 nét cuối", () => {
    render(<StrokeRules />);
    expect(screen.getByText("Trước – sau")).toBeInTheDocument();
    expect(screen.getByText("⏳ Ba nét cuối luôn viết sau cùng")).toBeInTheDocument();
    expect(screen.getByText("辶")).toBeInTheDocument();
  });
});
