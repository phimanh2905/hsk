import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "../progress";

describe("Progress", () => {
  it("hiện label + số % (luôn kèm số)", () => {
    render(<Progress value={25} max={100} label="Tiến độ" />);
    expect(screen.getByText("Tiến độ")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("role=progressbar với giá trị đúng", () => {
    render(<Progress value={3} max={4} label="Ôn tập" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("fill bg-action-primary, track bg-border-subtle", () => {
    render(<Progress value={50} label="T" />);
    const track = screen.getByRole("progressbar");
    expect(track.className).toContain("bg-border-subtle");
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-action-primary");
  });
});

describe("Progress — bare + gradient (spec 2026-10-04)", () => {
  it("không hiện label khi chỉ truyền ariaLabel, vẫn có role progressbar", () => {
    render(<Progress value={55} ariaLabel="Tiến độ bài học" />);
    expect(screen.getByRole("progressbar", { name: "Tiến độ bài học" })).toBeInTheDocument();
    expect(screen.queryByText("55%")).not.toBeInTheDocument();
  });
  it("gradient=true cho fill class gradient jade→vermilion", () => {
    render(<Progress value={55} ariaLabel="p" gradient />);
    expect((screen.getByRole("progressbar").firstChild as HTMLElement).className).toContain("bg-gradient-to-r");
  });
});

describe("Progress tone", () => {
  it("mặc định (không tone) giữ fill action-primary; gradient vẫn ưu tiên", () => {
    const { container } = render(<Progress value={40} />);
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} gradient />);
    expect(c2.querySelector('[class*="bg-gradient"]')).not.toBeNull();
  });
  it("size sm → track h-1.5; mặc định h-2.5", () => {
    const { container } = render(<Progress value={40} size="sm" />);
    expect(container.querySelector(".h-1\\.5")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} />);
    expect(c2.querySelector(".h-2\\.5")).not.toBeNull();
  });
  it("tone vermilion/amber đổi class fill", () => {
    const { container } = render(<Progress value={40} tone="vermilion" />);
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} tone="amber" />);
    expect(c2.querySelector(".bg-learning-progress")).not.toBeNull();
  });
  it("fill width theo value + role progressbar", () => {
    const { container } = render(<Progress value={45} ariaLabel="Độ bền" />);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect((container.querySelector('[role="progressbar"] > div') as HTMLElement).style.width).toBe("45%");
  });
});

describe("Progress stacked (port .progress-zone lesson.html)", () => {
  it("stacked: label trên track 6px, ẩn %, fill jade (port .progress-zone/.fill lesson.html)", () => {
    render(
      <Progress
        value={8}
        max={15}
        stacked
        tone="jade"
        ariaLabel="Tiến độ từ vựng"
        label={<span>Bài 4 · <b>8/15 từ (53%)</b></span>}
      />
    );
    const bar = screen.getByRole("progressbar", { name: "Tiến độ từ vựng" });
    expect(bar.className).toContain("h-1.5");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-learning-mastered");
    expect(fill.style.width).toBe("53%");
    expect(screen.queryByText("53%")).not.toBeInTheDocument(); // không render span % riêng
  });

  it("stacked: track không dùng flex-1 (flex-col sẽ ép cao theo basis 0 → vô hình)", () => {
    render(<Progress value={8} max={15} stacked ariaLabel="Tiến độ" />);
    const bar = screen.getByRole("progressbar", { name: "Tiến độ" });
    expect(bar.className).not.toContain("flex-1");
    expect(bar.className).toContain("w-full");
  });

  it("KHÔNG stacked: track giữ flex-1 (hàng ngang co giãn theo label)", () => {
    render(<Progress value={30} max={100} label="Tiến độ" />);
    const bar = screen.getByRole("progressbar", { name: "Tiến độ" });
    expect(bar.className).toContain("flex-1");
    expect(bar.className).not.toContain("w-full");
  });

  it("không có ariaLabel và label không phải string → bỏ hẳn aria-label (không phát \"\")", () => {
    const { container } = render(<Progress value={10} />);
    expect(container.querySelector('[role="progressbar"]')!.hasAttribute("aria-label")).toBe(false);
    const { container: c2 } = render(<Progress value={10} label={<b>X</b>} />);
    expect(c2.querySelector('[role="progressbar"]')!.hasAttribute("aria-label")).toBe(false);
  });

  it("mặc định giữ hành vi cũ: fill primary, hiện %", () => {
    render(<Progress value={50} label="Tiến độ" />);
    const bar = screen.getByRole("progressbar", { name: "Tiến độ" });
    expect(bar.className).toContain("h-2.5");
    expect((bar.firstElementChild as HTMLElement).className).toContain("bg-action-primary");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
