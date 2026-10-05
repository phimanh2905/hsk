import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReadingHero } from "./reading-hero";
import { READING_LIB } from "@/content/reading";

const item = READING_LIB[0]; // tea — HSK 4, min 5, n 48, nw 8

describe("ReadingHero", () => {
  it("kicker chứa lv; h1 = tên VI; sub chứa title + pinyin (class zh)", () => {
    render(<ReadingHero item={item} pct={0} cta="Đọc ngay" />);
    expect(screen.getByText(/Bài đọc đề xuất hôm nay · HSK 4/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Trà đạo và sự tĩnh lặng" })).toBeTruthy();
    const sub = screen.getByText(/茶道与宁静 · chádào yǔ níngjìng/);
    expect(sub.className).toContain("zh");
  });

  it("4 hpill chứa phút / số chữ / số từ mới / TTS", () => {
    render(<ReadingHero item={item} pct={0} cta="Đọc ngay" />);
    expect(screen.getByText("5 phút")).toBeTruthy();
    expect(screen.getByText("48 chữ")).toBeTruthy();
    expect(screen.getByText("8 từ mới")).toBeTruthy();
    expect(screen.getByText("Đọc bằng TTS")).toBeTruthy();
  });

  it("CTA vermilion link đúng /reading/{id} với text = cta", () => {
    render(<ReadingHero item={item} pct={30} cta="Đọc tiếp" />);
    const link = screen.getByRole("link", { name: "Đọc tiếp" });
    expect(link.getAttribute("href")).toBe("/reading/tea");
  });

  it("data-od-id = reading-hero", () => {
    render(<ReadingHero item={item} pct={0} cta="Đọc ngay" />);
    expect(document.querySelector('[data-od-id="reading-hero"]')).toBeTruthy();
  });
});
