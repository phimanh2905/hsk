import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import ReviewDashboard from "../review-dashboard";
import { progressStore } from "@/lib/store/progress-store";

// globals không bật trong vitest config → RTL auto-cleanup không chạy, phải cleanup thủ công
afterEach(cleanup);

beforeEach(() => localStorage.clear());

describe("ReviewDashboard (F1)", () => {
  it("localStorage trống → 6 ô counts seeded [12,34,8,41,96,191] + empty card tab vocab", () => {
    const { container } = render(<ReviewDashboard />);
    expect(screen.getByText("Thống kê học tập")).toBeInTheDocument();
    expect(container.querySelector('[data-stat="Cần ôn"]')!.textContent).toBe("12");
    expect(container.querySelector('[data-stat="Tổng đã học qua"]')!.textContent).toBe("191");
    expect(screen.getByText("Bộ thẻ đang trống")).toBeInTheDocument();
    expect(screen.getByText("Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.")).toBeInTheDocument();
    expect(screen.getByText("Vào kệ sách →")).toHaveAttribute("href", "/course");
  });
  it("đổi tab grammar → chỉ đổi text empty + link, giữ 6 ô", () => {
    const { container } = render(<ReviewDashboard />);
    act(() => screen.getByText("Ngữ pháp").click());
    expect(screen.getByText("Bấm nút ⭐ trên mẫu ngữ pháp để thêm vào bộ thẻ ôn tập.")).toBeInTheDocument();
    expect(screen.getByText("Vào mục ngữ pháp →")).toHaveAttribute("href", "/course/hsk1?skill=grammar");
    expect(container.querySelector('[data-stat="Cần ôn"]')!.textContent).toBe("12"); // layout giữ nguyên
  });
  it("star 1 từ trong store → số Mới thêm/Tổng suy diễn từ SRS (không còn seeded)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    expect(container.querySelector('[data-stat="Mới thêm"]')!.textContent).toBe("1");
    expect(container.querySelector('[data-stat="Tổng đã học qua"]')!.textContent).toBe("1");
    expect(screen.queryByText("191")).not.toBeInTheDocument();
    expect(screen.getByText(/Bắt đầu ôn tập \(1 thẻ\)/)).toBeInTheDocument();
  });
});
