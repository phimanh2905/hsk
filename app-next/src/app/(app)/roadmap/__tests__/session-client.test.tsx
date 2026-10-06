import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ToastProvider } from "@/components/shell/toast-provider";
import SessionClient from "@/components/roadmap/session-client";

vi.mock("@/lib/notebook/capture", () => ({ captureWrong: vi.fn() }));
import { captureWrong } from "@/lib/notebook/capture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

function renderSession(n: number) {
  return render(
    <ToastProvider>
      <SessionClient n={n} />
    </ToastProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

/* Session fixture lấy từ @/content/roadmap (nội dung tĩnh, buổi 1):
   quiz[0] = { q: "Thanh sắc (thanh 2) có dấu như thế nào?", options: [...], answer: 1, explain: "Thanh 2 là dấu sắc…" }
   test[0] (kind quiz) = { q: "Bốn thanh cơ bản của tiếng Trung là…", answer: 0, explain: "Thứ tự chuẩn…" } */
describe("SessionClient — auto-capture câu sai (spec §3.4.2)", () => {
  it("tab Trắc nghiệm: chọn đúng -> KHÔNG captureWrong", () => {
    renderSession(1);
    fireEvent.click(screen.getByRole("button", { name: "Trắc nghiệm" }));
    fireEvent.click(screen.getByRole("button", { name: "Dấu sắc (´)" })); // answer = 1
    expect(vi.mocked(captureWrong)).not.toHaveBeenCalled();
  });

  it("tab Trắc nghiệm: chọn sai -> captureWrong với đề + option sai/đúng", () => {
    renderSession(1);
    fireEvent.click(screen.getByRole("button", { name: "Trắc nghiệm" }));
    fireEvent.click(screen.getByRole("button", { name: "Dấu huyền (`)" })); // sai (answer = 1)
    expect(vi.mocked(captureWrong)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureWrong)).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Thanh sắc (thanh 2) có dấu như thế nào?",
        wrong: { zh: "Dấu huyền (`)" },
        right: { zh: "Dấu sắc (´)" },
        cause: expect.stringContaining("Thanh 2 là dấu sắc"),
      })
    );
  });

  it("tab Trắc nghiệm: câu đã answered -> không capture lại", () => {
    renderSession(1);
    fireEvent.click(screen.getByRole("button", { name: "Trắc nghiệm" }));
    fireEvent.click(screen.getByRole("button", { name: "Dấu huyền (`)" }));
    // nút đã disabled sau khi trả lời -> không thể click lại; assert vẫn chỉ 1 lần
    expect(screen.getByRole("button", { name: "Dấu huyền (`)" })).toHaveProperty("disabled", true);
    expect(vi.mocked(captureWrong)).toHaveBeenCalledTimes(1);
  });

  it("tab Bài kiểm tra: chọn sai -> captureWrong với đề + option sai/đúng", () => {
    renderSession(1); // buổi 1 không khóa tab test
    fireEvent.click(screen.getByRole("button", { name: "Bài kiểm tra" }));
    fireEvent.click(screen.getByRole("button", { name: "a á à ǎ" })); // sai (answer = 0)
    expect(vi.mocked(captureWrong)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureWrong)).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Bốn thanh cơ bản của tiếng Trung là…",
        wrong: { zh: "a á à ǎ" },
        right: { zh: "ā á ǎ à" },
        cause: expect.stringContaining("Thứ tự chuẩn"),
      })
    );
  });
});
