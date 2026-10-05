import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReadingCard } from "./reading-card";
import { READING_LIB } from "@/content/reading";

const item = READING_LIB[0]; // tea — HSK 4, culture

describe("ReadingCard", () => {
  it("hiện badge lv + thời lượng, title/pinyin/tên VI và excerpt", () => {
    render(
      <ReadingCard item={item} pct={0} saved={false} note="Chưa đọc · 8 từ mới" cta="Đọc ngay" onToggleSave={vi.fn()} />,
    );
    expect(screen.getByText("HSK 4")).toBeTruthy();
    expect(screen.getByText("5 phút")).toBeTruthy();
    expect(screen.getByText("茶道与宁静")).toBeTruthy();
    expect(screen.getByText("chádào yǔ níngjìng")).toBeTruthy();
    expect(screen.getByText("Trà đạo và sự tĩnh lặng")).toBeTruthy();
    expect(screen.getByText("Chưa đọc · 8 từ mới")).toBeTruthy();
  });

  it("star: aria-pressed=false → click gọi onToggleSave(id); saved → aria-pressed=true + label Bỏ lưu", async () => {
    const user = userEvent.setup();
    const onToggleSave = vi.fn();
    const { rerender } = render(
      <ReadingCard item={item} pct={0} saved={false} note="" cta="Đọc ngay" onToggleSave={onToggleSave} />,
    );
    const star = screen.getByRole("button", { name: "Lưu bài" });
    expect(star.getAttribute("aria-pressed")).toBe("false");
    await user.click(star);
    expect(onToggleSave).toHaveBeenCalledWith("tea");

    rerender(
      <ReadingCard item={item} pct={0} saved={true} note="" cta="Đọc ngay" onToggleSave={onToggleSave} />,
    );
    expect(screen.getByRole("button", { name: "Bỏ lưu" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("Progress render đúng pct; pct=0 → không render progressbar", () => {
    const { rerender } = render(
      <ReadingCard item={item} pct={40} saved={false} note="Đang đọc dở (40%)" cta="Đọc tiếp" onToggleSave={vi.fn()} />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");

    rerender(
      <ReadingCard item={item} pct={0} saved={false} note="Chưa đọc" cta="Đọc ngay" onToggleSave={vi.fn()} />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("CTA là Link đúng /reading/{id} với text = cta truyền vào", () => {
    render(
      <ReadingCard item={item} pct={0} saved={false} note="" cta="Đọc tiếp" onToggleSave={vi.fn()} />,
    );
    const link = screen.getByRole("link", { name: "Đọc tiếp" });
    expect(link.getAttribute("href")).toBe("/reading/tea");
  });

  it("data-od-id = read-{id} (hook e2e)", () => {
    render(
      <ReadingCard item={item} pct={0} saved={false} note="" cta="Đọc ngay" onToggleSave={vi.fn()} />,
    );
    expect(document.querySelector('[data-od-id="read-tea"]')).toBeTruthy();
  });
});
