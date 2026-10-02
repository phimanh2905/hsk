import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CertificatePage from "../page";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

describe("CertificatePage (G9 — 10 card coming-soon)", () => {
  it("2 section + đúng 10 card với logo H1…7-9, K1…K3", () => {
    render(<CertificatePage />);
    expect(screen.getByRole("heading", { name: "HSK 1–9 — Chuẩn HSK 3.0" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "HSKK — Kỳ thi nói" })).toBeTruthy();
    expect(screen.getAllByText("Sắp ra mắt")).toHaveLength(10);
    expect(screen.getByText("H1")).toBeTruthy();
    expect(screen.getByText("7-9")).toBeTruthy();
    expect(screen.getByText("K3")).toBeTruthy();
    expect(screen.getByText("11.092 từ, 3.000 chữ Hán — bậc cao đẳng: một bài thi chung xếp cấp 7/8/9, đủ 5 kỹ năng nghe nói đọc viết dịch.")).toBeTruthy();
  });
  it("bấm card → toast coming-soon", async () => {
    const user = userEvent.setup();
    render(<CertificatePage />);
    await user.click(screen.getAllByText("Sắp ra mắt")[0]);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!");
  });
});
