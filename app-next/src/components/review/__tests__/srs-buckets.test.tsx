import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { SrsBuckets, type BucketData } from "../srs-buckets";

afterEach(cleanup);

const bucket = (n: number): BucketData => ({
  count: n,
  words: Array.from({ length: Math.min(n, 3) }, (_, i) => ({ zh: `字${i}`, key: `k${i}` })),
});

describe("SrsBuckets", () => {
  it("3 bucket đúng tên + desc + count", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(5)} cons={bucket(8)} mast={bucket(5)} onChipClick={() => {}} />
    );
    expect(container.textContent).toContain("Yếu · Dễ quên");
    expect(container.textContent).toContain("Cần ôn gấp trong hôm nay");
    expect(container.textContent).toContain("Đang củng cố");
    expect(container.textContent).toContain("Ôn định kỳ 3 ngày một lần");
    expect(container.textContent).toContain("Đã khắc sâu");
    expect(container.textContent).toContain("Ôn nhắc lại sau 7 ngày");
    expect(container.querySelectorAll('[data-testid="bucket"]')).toHaveLength(3);
  });
  it("tối đa 3 chips/bucket; count 0 → 'Trống'", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(5)} cons={bucket(0)} mast={bucket(1)} onChipClick={() => {}} />
    );
    const buckets = container.querySelectorAll('[data-testid="bucket"]');
    expect(buckets[0].querySelectorAll("button")).toHaveLength(3);
    expect(buckets[1].textContent).toContain("Trống");
    expect(buckets[2].querySelectorAll("button")).toHaveLength(1);
  });
  it("tone class: rose/amber/jade wash (Task 1)", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(1)} cons={bucket(0)} mast={bucket(0)} onChipClick={() => {}} />
    );
    const [rose, amber, jade] = Array.from(container.querySelectorAll('[data-testid="bucket"]'));
    expect(rose.className).toContain("bg-rose-wash");
    expect(amber.className).toContain("bg-amber-wash");
    expect(jade.className).toContain("bg-jade-wash");
  });
  it("click chip → onChipClick(zh)", () => {
    const onChipClick = vi.fn();
    const { container } = render(
      <SrsBuckets weak={bucket(1)} cons={bucket(0)} mast={bucket(0)} onChipClick={onChipClick} />
    );
    fireEvent.click(container.querySelector('[data-testid="bucket"] button')!);
    expect(onChipClick).toHaveBeenCalledWith("字0");
  });
  it("cap cấu trúc: bucket nhận >3 words vẫn render đúng 3 chip", () => {
    const five: BucketData = {
      count: 5,
      words: Array.from({ length: 5 }, (_, i) => ({ zh: `字${i}`, key: `k${i}` })),
    };
    const { container } = render(
      <SrsBuckets weak={five} cons={bucket(0)} mast={bucket(0)} onChipClick={() => {}} />
    );
    expect(container.querySelector('[data-testid="bucket"]')!.querySelectorAll("button")).toHaveLength(3);
  });
});
