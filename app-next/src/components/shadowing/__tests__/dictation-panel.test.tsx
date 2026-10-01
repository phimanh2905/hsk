import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictationPanel from "../dictation-panel";
import { shadowingSubtitles } from "@/content/shadowing";

const s1 = shadowingSubtitles["EA3rwvr99Q0"][0]; // 啊! 我才离开几天! ...
const s5 = shadowingSubtitles["EA3rwvr99Q0"][4]; // 退! ×8

describe("DictationPanel (G5 dictation)", () => {
  it("gõ đúng (khác dấu câu/khoảng trắng) → ✅ xanh + hiện đáp án", async () => {
    const user = userEvent.setup();
    render(<DictationPanel sentence={s5} onListen={() => {}} onSkip={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Gõ những gì bạn nghe được/), "退 退! 退退 退退! 退, 退。");
    await user.click(screen.getByTestId("dict-check"));
    expect(screen.getByText(/✅ Chính xác/)).toBeTruthy();
  });
  it("sai → chữ sai đỏ + đáp án; Enter = Kiểm tra", async () => {
    const user = userEvent.setup();
    render(<DictationPanel sentence={s5} onListen={() => {}} onSkip={() => {}} />);
    const input = screen.getByPlaceholderText(/Gõ những gì bạn nghe được/);
    await user.type(input, "退 退 退 退 退 退 退 停!{enter}");
    expect(screen.getByText(/❌ Chưa đúng/)).toBeTruthy();
    expect(screen.getByText("停", { selector: "span.text-red-600" })).toBeTruthy();
    expect(screen.getByText(/Đáp án:/)).toBeTruthy();
  });
  it("input rỗng + Kiểm tra → nhắc nhập; Bỏ qua gọi onSkip; Nghe gọi onListen", async () => {
    const onSkip = vi.fn(); const onListen = vi.fn();
    const user = userEvent.setup();
    render(<DictationPanel sentence={s1} onListen={onListen} onSkip={onSkip} />);
    await user.click(screen.getByTestId("dict-check"));
    expect(screen.getByText(/Hãy gõ những gì bạn nghe được trước đã/)).toBeTruthy();
    await user.click(screen.getByTestId("dict-skip"));
    expect(onSkip).toHaveBeenCalled();
    await user.click(screen.getByTestId("dict-listen"));
    expect(onListen).toHaveBeenCalled();
  });
});
