import { describe, expect, it, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioCatalog } from "../studio-catalog";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

afterEach(cleanup);

const RADS = RADICAL_INDEX.filter((r) =>
  ["水", "口", "手", "木", "火", "人", "女", "日"].includes(r.char),
);
const CHARS = Object.values(CHAR_META).filter((c) =>
  ["没", "洗", "汉"].includes(c.ch),
);

describe("StudioCatalog", () => {
  it("rad mode: render card bộ thủ + count chữ + mode switch", () => {
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel="8 bộ thủ · 1 trang"
        page={1}
        pages={1}
        cur="水"
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect(view.getByText("Kho tra cứu")).toBeTruthy();
    expect(view.getByTestId("cat-count").textContent).toContain("8 bộ thủ");
    // mode switch: 2 nút aria-pressed, rad đang bật
    const mode = document.querySelector('[data-od-id="catalog-mode"]') as HTMLElement;
    expect(mode).not.toBeNull();
    const btns = Array.from(mode.querySelectorAll("button"));
    expect(btns).toHaveLength(2);
    expect(btns.find((b) => b.textContent?.includes("214 Bộ thủ"))?.getAttribute("aria-pressed")).toBe("true");
    expect(btns.find((b) => b.textContent?.includes("Theo cấp độ HSK"))?.getAttribute("aria-pressed")).toBe("false");
    const card = view.getByRole("button", { name: /水/ });
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.getAttribute("data-od-id")).toBe("rad-水");
  });

  it("click mode-switch → onModeChange, KHÔNG đổi selection", async () => {
    const onModeChange = vi.fn();
    const onSelect = vi.fn();
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel=""
        page={1}
        pages={1}
        cur="水"
        onSelect={onSelect}
        onPage={vi.fn()}
        onModeChange={onModeChange}
      />,
    );
    await userEvent.click(view.getByRole("button", { name: /Theo cấp độ HSK/ }));
    expect(onModeChange).toHaveBeenCalledWith("hsk");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("rad card: glyph + tên hán việt + count chữ, KHÔNG badge/spill", () => {
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel="8 bộ thủ · 1 trang"
        page={1}
        pages={1}
        cur="水"
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    const card = document.querySelector('[data-od-id="rad-水"]') as HTMLElement;
    expect(card.textContent).toContain("Thủy");
    expect(/\d+ chữ/.test(card.textContent ?? "")).toBe(true);
  });

  it("hsk mode: card chữ + pinyin + level", () => {
    const view = render(
      <StudioCatalog
        mode="hsk"
        rads={[]}
        chars={CHARS}
        totalLabel="3 chữ"
        page={1}
        pages={1}
        cur="没"
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    const card = view.getByRole("button", { name: /没/ });
    expect(card.getAttribute("data-od-id")).toBe("zcard-没");
    expect(card.textContent).toContain("méi");
    expect(card.textContent).toContain("HSK");
  });

  it("click card → onSelect đúng kind/g", async () => {
    const onSelect = vi.fn();
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel=""
        page={1}
        pages={1}
        cur=""
        onSelect={onSelect}
        onPage={vi.fn()}
      />,
    );
    await userEvent.click(view.getByRole("button", { name: /口/ }));
    expect(onSelect).toHaveBeenCalledWith({ kind: "rad", g: "口" });
  });

  it("hsk click → onSelect kind char", async () => {
    const onSelect = vi.fn();
    const view = render(
      <StudioCatalog
        mode="hsk"
        rads={[]}
        chars={CHARS}
        totalLabel="3 chữ"
        page={1}
        pages={1}
        cur=""
        onSelect={onSelect}
        onPage={vi.fn()}
      />,
    );
    await userEvent.click(view.getByRole("button", { name: /洗/ }));
    expect(onSelect).toHaveBeenCalledWith({ kind: "char", g: "洗" });
  });

  it("KHÔNG còn badge tiến độ/spill (bỏ theo mock)", () => {
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel=""
        page={1}
        pages={1}
        cur=""
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect(view.queryByText("Đã thuộc")).toBeNull();
    expect(view.queryByText("Đang luyện")).toBeNull();
    expect(view.queryByText("Mới")).toBeNull();
  });

  it("empty state theo mode", () => {
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={[]}
        chars={[]}
        totalLabel="0"
        page={1}
        pages={1}
        cur=""
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect(view.getByText("Không có bộ thủ nào khớp.")).toBeTruthy();
  });

  it("empty state hsk", () => {
    const view = render(
      <StudioCatalog
        mode="hsk"
        rads={[]}
        chars={[]}
        totalLabel="0"
        page={1}
        pages={1}
        cur=""
        onSelect={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect(view.getByText("Không có chữ nào khớp.")).toBeTruthy();
  });

  it("pager giữ nguyên: label, onPage, disable ở biên", () => {
    const onPage = vi.fn();
    const view = render(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel="8 bộ thủ"
        page={2}
        pages={3}
        cur=""
        onSelect={vi.fn()}
        onPage={onPage}
      />,
    );
    expect(view.getByTestId("pager-label").textContent).toContain("2 / 3");
    act(() => (view.getByLabelText("Trang sau") as HTMLButtonElement).click());
    expect(onPage).toHaveBeenCalledWith(3);
    expect((view.getByLabelText("Trang trước") as HTMLButtonElement).disabled).toBe(false);

    view.rerender(
      <StudioCatalog
        mode="rad"
        rads={RADS}
        chars={[]}
        totalLabel="8 bộ thủ"
        page={1}
        pages={1}
        cur=""
        onSelect={vi.fn()}
        onPage={onPage}
      />,
    );
    expect((view.getByLabelText("Trang trước") as HTMLButtonElement).disabled).toBe(true);
    expect((view.getByLabelText("Trang sau") as HTMLButtonElement).disabled).toBe(true);
  });
});
