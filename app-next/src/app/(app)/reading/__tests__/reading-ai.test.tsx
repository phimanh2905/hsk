import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingClient from "../reading-client";

const askAiMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai-client", () => ({ askAi: askAiMock }));

const speakMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  askAiMock.mockReset();
  vi.stubGlobal("speechSynthesis", {
    speak: speakMock, cancel: vi.fn(), speaking: false,
    getVoices: vi.fn(() => [{ name: "Tingting", lang: "zh-CN" }]),
  });
  speakMock.mockClear();
});

async function createDoc(text: string) {
  const user = userEvent.setup();
  render(<ReadingClient />);
  await user.type(screen.getByLabelText(/Nội dung bài đọc/), text);
  await user.click(screen.getByText("Tạo bài đọc"));
  expect(screen.getByText(/2 câu/)).toBeInTheDocument();
  return user;
}

describe("ReadingClient — AI dịch & chú thích (Wave 7 T6)", () => {
  it("Tạo bài đọc → bấm 'AI dịch & chú thích' → askAi mỗi câu 1 message JSON, gán py/vi", async () => {
    askAiMock.mockImplementation(async (messages: Array<{ content: string }>) => {
      const zh = messages[0].content.match(/: (.+)$/)?.[1] ?? "";
      if (zh.includes("今天天气很好"))
        return JSON.stringify({ zh: "今天天气很好。", py: "jīntiān tiānqì hěn hǎo.", vi: "Hôm nay thời tiết rất đẹp." });
      return JSON.stringify({ zh: "我去买东西。", py: "wǒ qù mǎi dōngxi.", vi: "Tôi đi mua đồ." });
    });
    const user = await createDoc("今天天气很好。我去买东西。");
    await user.click(screen.getByRole("button", { name: /AI dịch & chú thích/ }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Đã chú thích bằng AI"),
    );
    expect(askAiMock).toHaveBeenCalledTimes(2);
    const m0 = askAiMock.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(m0.length).toBe(1);
    expect(m0[0].content).toContain("今天天气很好。");
    expect(m0[0].content).toContain("pinyin");
    // bật Pinyin + Dịch → nội dung AI hiện
    await user.click(screen.getByText("Pinyin"));
    await user.click(screen.getByText("Dịch"));
    expect(screen.getByText("jīntiān tiānqì hěn hǎo.")).toBeInTheDocument();
    expect(screen.getByText("Hôm nay thời tiết rất đẹp.")).toBeInTheDocument();
    expect(screen.getByText("Tôi đi mua đồ.")).toBeInTheDocument();
  });

  it("AI trả JSON rác → không crash, giữ nguyên doc, vẫn toast thành công cho câu parse được", async () => {
    askAiMock.mockResolvedValue("xin lỗi tôi không hiểu *");
    const user = await createDoc("今天天气很好。我去买东西。");
    await user.click(screen.getByRole("button", { name: /AI dịch & chú thích/ }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Đã chú thích bằng AI"),
    );
    // doc vẫn render 2 câu, không thêm gì
    expect(screen.getByText(/2 câu/)).toBeInTheDocument();
    expect(screen.getByText("今天天气很好。")).toBeInTheDocument();
  });

  it("askAi lỗi (429/502) → toast 'AI đang bận, thử lại sau'", async () => {
    askAiMock.mockRejectedValue(new Error("429"));
    const user = await createDoc("今天天气很好。我去买东西。");
    await user.click(screen.getByRole("button", { name: /AI dịch & chú thích/ }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("AI đang bận, thử lại sau"),
    );
  });
});
