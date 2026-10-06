// app-next/src/components/my-grammar/__tests__/grammar-card.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { GRAMMAR_POINTS } from "@/content/grammar-points";
import { GrammarCard } from "../grammar-card";
import { ToastProvider } from "@/components/shell/toast-provider";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

afterEach(() => { cleanup(); speakMock.mockClear(); });

const ba = GRAMMAR_POINTS[0];

describe("GrammarCard", () => {
  it("level pill + title + hz + def + formula blocks (key jade) nối +", () => {
    const { container } = render(
      <GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />,
    );
    expect(getByOD("grammar-ba").textContent).toContain("CÂU CHỮ 把");
    expect(getByOD("grammar-ba").textContent).toContain("把字句");
    expect(getByOD("grammar-ba").textContent).toContain("HSK 3");
    expect(document.body.textContent).toContain("Xử lý tân ngữ và kết quả hành động");
    const blocks = container.querySelectorAll("[data-formula] > span[data-block]");
    expect(blocks.length).toBe(ba.formula.length);
    expect(container.querySelectorAll("[data-formula] > [data-plus]").length).toBe(ba.formula.length - 1);
    const keyBlock = container.querySelector('[data-block="key"]')!;
    expect(keyBlock.textContent).toBe("把");
    expect(keyBlock.className).toContain("bg-jade-wash");
  });
  it("pitfall: 'Bẫy người Việt:' + <b>bold</b> + rest ghép đúng (Review Focus #1)", () => {
    render(<GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />);
    expect(document.body.textContent).toContain("Bẫy người Việt:");
    expect(document.body.textContent).toContain(
      "Động từ không được đứng đơn độc sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác."
    );
    const bold = document.querySelector("[data-pitfall] b")!;
    expect(bold.textContent).toBe("không được đứng đơn độc");
  });
  it("ví dụ: đủ hz/py/vi + speak từng câu (rate 0.95) + toast 'Đang phát âm' mỗi lần 🔊", () => {
    const { getByLabelText } = render(
      <ToastProvider>
        <GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />
      </ToastProvider>,
    );
    expect(document.body.textContent).toContain("VÍ DỤ NGỮ CẢNH");
    expect(document.body.textContent).toContain("请把书打开。");
    expect(document.body.textContent).toContain("Xin hãy mở sách ra.");
    act(() => getByLabelText("Nghe phát âm câu 1").click());
    expect(speakMock).toHaveBeenCalledWith("请把书打开。", { rate: 0.95 });
    expect(document.querySelector('[role="status"]')!.textContent).toBe("Đang phát âm: 请把书打开。");
    act(() => getByLabelText("Nghe phát âm câu 2").click());
    expect(speakMock).toHaveBeenCalledWith("把门关上吧。", { rate: 0.95 });
    expect(document.querySelector('[role="status"]')!.textContent).toBe("Đang phát âm: 把门关上吧。");
  });
  it("★ aria-pressed theo saved + onToggleSave(id); ⋮ → onMenu(id); footer link /review", () => {
    const onToggleSave = vi.fn();
    const onMenu = vi.fn();
    const { getByLabelText, getByText, rerender } = render(
      <GrammarCard point={ba} saved={false} onToggleSave={onToggleSave} onMenu={onMenu} />,
    );
    const star = getByLabelText("Lưu cấu trúc");
    expect(star.getAttribute("aria-pressed")).toBe("false");
    act(() => star.click());
    expect(onToggleSave).toHaveBeenCalledWith("ba");
    act(() => getByLabelText("Tùy chọn").click());
    expect(onMenu).toHaveBeenCalledWith("ba");
    rerender(<GrammarCard point={ba} saved onToggleSave={onToggleSave} onMenu={onMenu} />);
    expect(getByLabelText("Lưu cấu trúc").getAttribute("aria-pressed")).toBe("true");
    expect(getByLabelText("Lưu cấu trúc").className).toContain("bg-amber-wash");
    expect(getByText("Luyện tập cấu trúc này").getAttribute("href")).toBe("/review");
  });
});

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
