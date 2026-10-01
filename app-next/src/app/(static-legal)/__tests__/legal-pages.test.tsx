import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage from "../../terms/page";
import PrivacyPage from "../../privacy/page";

describe("/terms", () => {
  it("hiện đúng 5 mục với copy nguyên văn", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Điều khoản sử dụng" })).toBeInTheDocument();
    for (const h of ["1. Chấp nhận điều khoản", "2. Nội dung học liệu", "3. Tài khoản", "4. Sử dụng hợp lý", "5. Thay đổi điều khoản"]) {
      expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    }
    const link = screen.getByRole("link", { name: "Góp ý" });
    expect(link).toHaveAttribute("href", "/feedback");
  });
});

describe("/privacy", () => {
  it("hiện đúng 5 mục và link xoá tài khoản", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Chính sách quyền riêng tư" })).toBeInTheDocument();
    for (const h of ["1. Dữ liệu thu thập", "2. Mục đích sử dụng", "3. Lưu trữ & bảo mật", "4. Quyền của bạn", "5. Liên hệ"]) {
      expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Xoá tài khoản" })).toHaveAttribute("href", "/delete-account");
  });
});
