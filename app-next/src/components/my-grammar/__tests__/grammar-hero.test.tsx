import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { GrammarHero } from "../grammar-hero";

afterEach(cleanup);

describe("GrammarHero", () => {
  it("eyebrow + h1 deviation + p + 3 pills + CTA (spec §5.1)", () => {
    const onReview = vi.fn();
    const { getByText } = render(
      <GrammarHero total={6} savedCount={2} topLevel="HSK 4" topCount={2} onReview={onReview} />,
    );
    expect(getByText("SỔ TAY CẤU TRÚC NGỮ PHÁP HSK")).toBeTruthy();
    expect(document.body.textContent).toContain("Sổ tay có 6 cấu trúc · 2 cấu trúc đã lưu");
    expect(document.body.textContent).toContain("Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây");
    expect(getByText("📘 HSK 4: 2 mẫu")).toBeTruthy();
    expect(getByText("⭐ 2 yêu thích")).toBeTruthy();
    expect(getByText("📦 6 cấu trúc")).toBeTruthy();
    act(() => getByText("🎯 Luyện phản xạ cấu trúc hôm nay").click());
    expect(onReview).toHaveBeenCalledTimes(1);
  });
  it("topLevel null → pill ẩn", () => {
    render(<GrammarHero total={0} savedCount={0} topLevel={null} topCount={0} onReview={() => {}} />);
    expect(document.body.textContent).not.toContain("📘");
  });
});
