import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { STUDIO_CHARS } from "@/content/hanzi-studio";
import { StudioCatalog } from "../studio-catalog";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioCatalog>[0]> = {}) => {
  const r = render(
    <StudioCatalog
      chars={STUDIO_CHARS}
      total={12}
      page={1}
      pages={1}
      level="all"
      cur="爱"
      onSelect={() => {}}
      onPage={() => {}}
      {...over}
    />,
  );
  return { ...r, getByODId };
};

describe("StudioCatalog", () => {
  it("catCount + pager label đúng copy mock", () => {
    const { getByTestId } = setup({ level: "HSK 2" });
    expect(getByTestId("cat-count").textContent).toBe("12 chữ mẫu · HSK 2");
    expect(getByTestId("pager-label").textContent).toBe("Trang 1 / 1 · 12 chữ mẫu");
  });

  it("zcard: glyph, pinyin · số nét, spill theo st, badge done có check", () => {
    const { getByODId } = setup();
    const card = getByODId("zcard-爱");
    expect(card.textContent).toContain("ài · 10 nét");
    expect(card.textContent).toContain("Mới");
    const doneCard = getByODId("zcard-人");
    expect(doneCard.textContent).toContain("Đã thuộc");
    expect(doneCard.querySelector(".bg-learning-mastered")).not.toBeNull();
    const midCard = getByODId("zcard-好");
    expect(midCard.textContent).toContain("Đang luyện");
    expect(midCard.querySelector(".bg-learning-progress")).not.toBeNull();
  });

  it("card active có aria-pressed + border accent; click → onSelect(ch)", () => {
    const onSelect = vi.fn();
    const { getByODId } = setup({ onSelect });
    expect(getByODId("zcard-爱").getAttribute("aria-pressed")).toBe("true");
    expect(getByODId("zcard-好").getAttribute("aria-pressed")).toBe("false");
    act(() => getByODId("zcard-好").click());
    expect(onSelect).toHaveBeenCalledWith("好");
  });

  it("pager disable ở biên, onPage nhận trang mới", () => {
    const onPage = vi.fn();
    const { getByLabelText } = setup({ page: 2, pages: 3, onPage });
    const prev = getByLabelText("Trang trước") as HTMLButtonElement;
    const next = getByLabelText("Trang sau") as HTMLButtonElement;
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    act(() => next.click());
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("biên: page=1 → prev disabled; page=pages → next disabled", () => {
    const { getByLabelText, rerender } = setup({});
    expect((getByLabelText("Trang trước") as HTMLButtonElement).disabled).toBe(true);
    rerender(
      <StudioCatalog
        chars={STUDIO_CHARS} total={12} page={1} pages={1} level="all" cur="爱"
        onSelect={() => {}} onPage={() => {}}
      />,
    );
    expect((getByLabelText("Trang sau") as HTMLButtonElement).disabled).toBe(true);
  });

  it("rỗng → empty state đúng copy", () => {
    const { getByText } = setup({ chars: [], total: 0 });
    expect(getByText("Không có chữ nào khớp bộ lọc.")).toBeTruthy();
  });
});

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
