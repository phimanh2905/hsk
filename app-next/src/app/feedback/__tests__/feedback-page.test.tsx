import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FeedbackPage from "../page";

// ToastProvider là mock của plan 10; stub để test độc lập
vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

function stored(): Array<{ text: string; at: string }> {
  return JSON.parse(localStorage.getItem("bye.feedback") || "[]");
}

beforeEach(() => {
  localStorage.clear();
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
});

describe("feedback page", () => {
  it("append entry {text, at ISO} vào bye.feedback qua ProgressStore rồi xoá textarea", () => {
    render(<FeedbackPage />);
    const textarea = screen.getByLabelText("Nội dung góp ý");
    fireEvent.change(textarea, { target: { value: "App hay quá!" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));

    const items = stored();
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("App hay quá!");
    expect(items[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // format thời gian: ISO 8601
    expect(new Date(items[0].at).toString()).not.toBe("Invalid Date");
    expect((textarea as HTMLTextAreaElement).value).toBe("");
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Cảm ơn bạn! Góp ý đã được ghi nhận.");
  });

  it("append nối tiếp vào dữ liệu cũ, không ghi đè", () => {
    localStorage.setItem("bye.feedback", JSON.stringify([{ text: "cũ", at: "2026-01-01T00:00:00.000Z" }]));
    render(<FeedbackPage />);
    fireEvent.change(screen.getByLabelText("Nội dung góp ý"), { target: { value: "mới" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));
    const items = stored();
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("cũ");
    expect(items[1].text).toBe("mới");
  });

  it("text rỗng (chỉ whitespace) thì không lưu, không toast", () => {
    render(<FeedbackPage />);
    fireEvent.change(screen.getByLabelText("Nội dung góp ý"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));
    expect(stored()).toHaveLength(0);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBeUndefined();
  });
});
