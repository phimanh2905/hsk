import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryHero } from "../memory-hero";

afterEach(cleanup);

describe("MemoryHero", () => {
  it("render kicker, h1 count tô vermilion, 3 stat", () => {
    const { container } = render(
      <MemoryHero count={18} avgMem={82} estMinutes={6} urgent={5} emptyQueue={false} onStart={() => {}} />
    );
    expect(container.textContent).toContain("TỔNG QUAN TRÍ NHỚ HÔM NAY");
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("18 từ");
    expect(container.textContent).toContain("82%");
    expect(container.textContent).toContain("~6 phút");
    expect(container.textContent).toContain("Cần ôn gấp");
  });
  it("CTA label theo emptyQueue; click gọi onStart", () => {
    const onStart = vi.fn();
    const { rerender } = render(
      <MemoryHero count={18} avgMem={82} estMinutes={6} urgent={5} emptyQueue={false} onStart={onStart} />
    );
    fireEvent.click(screen_getStart());
    expect(onStart).toHaveBeenCalledTimes(1);
    rerender(<MemoryHero count={0} avgMem={0} estMinutes={0} urgent={0} emptyQueue onStart={onStart} />);
    expect(screen_getStart().textContent).toContain("Ôn thử tất cả (0 từ)");
  });
});

function screen_getStart(): HTMLElement {
  return document.querySelector('[data-testid="start-session"]')!;
}
