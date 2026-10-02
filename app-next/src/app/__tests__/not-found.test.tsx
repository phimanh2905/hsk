import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../not-found";

describe("not-found (404)", () => {
  it("hiện mascot 🤔, h1 404, đúng copy và nút về trang chủ", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Trang bạn tìm không tồn tại hoặc đã bị chuyển.")).toBeInTheDocument();
    expect(screen.getByText("🤔")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
  });
});
