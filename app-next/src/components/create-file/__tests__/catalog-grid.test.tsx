import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogGrid from "../catalog-grid";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

describe("CatalogGrid (G6 — SPEC-16 §A)", () => {
  it("đủ 3 nhóm + 9 card link đúng tpl", () => {
    render(<CatalogGrid />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(9);
    expect(screen.getByRole("link", { name: /Luyện viết theo thứ tự nét/ })).toHaveAttribute("href", "/create-file/stroke-order");
    expect(screen.getByRole("link", { name: /Bìa vở luyện chữ/ })).toHaveAttribute("href", "/create-file/cover");
  });
  it("banner gate + link nhóm Facebook hiển thị; 9 SVG inline không ảnh ngoài", () => {
    const { container } = render(<CatalogGrid />);
    expect(screen.getByText(/Cần mã tải file để in/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tham gia nhóm để lấy mã" })).toHaveAttribute("href", "https://www.facebook.com/groups/nhaihsk");
    expect(container.querySelectorAll("svg")).toHaveLength(9);
    expect(container.querySelector('svg image, svg [href*="http"]')).toBeNull();
  });
});
