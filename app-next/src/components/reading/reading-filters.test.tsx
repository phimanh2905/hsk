import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReadingFilters } from "./reading-filters";
import type { ReadingFilter } from "@/lib/reading/library";

const base: ReadingFilter = { level: "all", cat: "all", q: "" };

describe("ReadingFilters", () => {
  it("render đủ chips: 2 'Tất cả' + 6 level + 4 cat + 'Đã lưu'", () => {
    render(<ReadingFilters filter={base} onChange={vi.fn()} count={7} />);
    expect(screen.getAllByRole("button", { name: "Tất cả" }).length).toBe(2);
    for (const lv of ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]) {
      expect(screen.getByRole("button", { name: lv })).toBeTruthy();
    }
    for (const cat of ["Đời sống", "Văn hoá", "Ngụ ngôn", "Luyện đề", "Đã lưu"]) {
      expect(screen.getByRole("button", { name: cat })).toBeTruthy();
    }
  });

  it("click level chip → onChange với level mới", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReadingFilters filter={base} onChange={onChange} count={7} />);
    await user.click(screen.getByRole("button", { name: "HSK 3" }));
    expect(onChange).toHaveBeenCalledWith({ ...base, level: "HSK 3" });
  });

  it("click 'Đã lưu' → onChange cat saved; click cat → cat key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReadingFilters filter={base} onChange={onChange} count={7} />);
    await user.click(screen.getByRole("button", { name: "Đã lưu" }));
    expect(onChange).toHaveBeenCalledWith({ ...base, cat: "saved" });
    await user.click(screen.getByRole("button", { name: "Ngụ ngôn" }));
    expect(onChange).toHaveBeenCalledWith({ ...base, cat: "fable" });
  });

  it("gõ search → onChange q; count line aria-live polite", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReadingFilters filter={base} onChange={onChange} count={7} />);
    await user.type(screen.getByLabelText("Tìm bài đọc"), "trà");
    expect(onChange).toHaveBeenCalledWith({ ...base, q: "t" });
    expect(onChange).toHaveBeenLastCalledWith({ ...base, q: "à" });
    const count = screen.getByText("7 bài");
    expect(count.getAttribute("aria-live")).toBe("polite");
  });
});
