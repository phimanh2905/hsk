// app-next/src/components/pinyin/lab/__tests__/sound-inspector.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SoundInspector } from "../sound-inspector";

afterEach(cleanup);

describe("SoundInspector", () => {
  it("thanh mẫu: title + desc + 'Khẩu hình:' + 4 hàng tone + speaker", () => {
    const onSpeak = vi.fn();
    const { getByLabelText, getByText } = render(
      <SoundInspector sel="b" onDrill={() => {}} onSpeak={onSpeak} />,
    );
    expect(getByText("Âm đang chọn: b (thanh mẫu)")).toBeTruthy();
    expect(document.body.textContent).toContain("Âm hai môi, không bật hơi");
    expect(document.body.textContent).toContain("Khẩu hình:");
    expect(document.body.textContent).toContain("Bảng ghép 4 thanh điệu");
    expect(document.body.textContent).toContain("爸");
    act(() => getByLabelText("Nghe bà").click());
    expect(onSpeak).toHaveBeenCalledWith("bà");
  });
  it("bán nguyên âm w: title '(bán nguyên âm)'", () => {
    const { getByText } = render(<SoundInspector sel="w" onDrill={() => {}} onSpeak={() => {}} />);
    expect(getByText("Âm đang chọn: w (bán nguyên âm)")).toBeTruthy();
  });
  it("drill → onDrill(sel)", () => {
    const onDrill = vi.fn();
    const { getByText } = render(<SoundInspector sel="b" onDrill={onDrill} onSpeak={() => {}} />);
    act(() => getByText("Luyện riêng với âm này").click());
    expect(onDrill).toHaveBeenCalledWith("b");
  });
});
