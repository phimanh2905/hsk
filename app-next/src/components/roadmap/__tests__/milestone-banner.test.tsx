import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilestoneBanner } from "../milestone-banner";

describe("MilestoneBanner", () => {
  it("render kicker, title, progressbar với aria-valuenow", () => {
    render(
      <MilestoneBanner
        kicker="CHẶNG 1 · NỀN TẢNG GIAO TIẾP"
        title="Chặng 1: Giao tiếp thường nhật"
        sub={<>Đã đạt: <b>6/20 bài</b> hoàn thành (30%)</>}
        pct={30}
        ariaLabel="Tiến độ chặng 1"
        currentLabel={<>Trạm hiện tại: <b>Trạm 4: Sở thích</b></>}
        endLabel={<>Còn <b>2 bài</b> tới mốc kiểm tra</>}
      />,
    );
    expect(screen.getByText("CHẶNG 1 · NỀN TẢNG GIAO TIẾP")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Tiến độ chặng 1" }).getAttribute("aria-valuenow")).toBe("30");
  });
  it("M-3 — mọi <b> trong sub/currentLabel/endLabel render ink (text-text-primary)", () => {
    render(
      <MilestoneBanner
        kicker="K" title="T"
        sub={<>Đã đạt: <b>6/20 bài</b> hoàn thành (30%)</>}
        pct={30} ariaLabel="P"
        currentLabel={<>Trạm hiện tại: <b>Trạm 4</b></>}
        endLabel={<>Còn <b>2 bài</b> tới mốc</>}
      />,
    );
    for (const text of ["6/20 bài", "Trạm 4", "2 bài"]) {
      expect(screen.getByText(text).className).toContain("text-text-primary");
    }
  });
  it("meta row 2 đầu hiện cả currentLabel và endLabel", () => {
    render(
      <MilestoneBanner
        kicker="K" title="T" sub="S" pct={0} ariaLabel="P"
        currentLabel="Trạm hiện tại: X" endLabel="Còn 14 bài"
      />,
    );
    expect(screen.getByText(/Trạm hiện tại: X/)).toBeTruthy();
    expect(screen.getByText(/Còn 14 bài/)).toBeTruthy();
  });
});
