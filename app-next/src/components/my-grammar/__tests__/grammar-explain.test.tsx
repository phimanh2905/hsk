import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { GRAMMAR_POINTS } from "@/content/grammar-points";
import { GrammarCard } from "../grammar-card";
import { ToastProvider } from "@/components/shell/toast-provider";

const askAiMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai-client", () => ({ askAi: askAiMock }));

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

afterEach(() => {
  cleanup();
  askAiMock.mockReset();
});

const ba = GRAMMAR_POINTS[0];

function renderCard() {
  return render(
    <ToastProvider>
      <GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />
    </ToastProvider>,
  );
}

describe("GrammarCard — nút Giải thích AI (Wave 7 T4)", () => {
  it("bấm 'Giải thích' → askAi với content chứa title + hz + level + def", async () => {
    askAiMock.mockResolvedValue("Giải thích chi tiết…");
    renderCard();
    await act(async () => {
      screen.getByRole("button", { name: /Giải thích/ }).click();
    });
    expect(askAiMock).toHaveBeenCalledTimes(1);
    const messages = askAiMock.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toContain(ba.title);
    expect(messages[0].content).toContain(ba.hz);
    expect(messages[0].content).toContain(ba.level);
    expect(messages[0].content).toContain(ba.def);
  });

  it("đang tải → hiện '…'; resolve → text render trong card", async () => {
    let resolve!: (v: string) => void;
    askAiMock.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    renderCard();
    await act(async () => {
      screen.getByRole("button", { name: /Giải thích/ }).click();
    });
    expect(screen.getByText("…")).toBeTruthy();
    await act(async () => {
      resolve("Công thức: S + 把 + O + V + …");
    });
    await waitFor(() =>
      expect(screen.getByText(/Công thức: S \+ 把/)).toBeTruthy(),
    );
  });

  it("reject → toast lỗi thân thiện, không render kết quả", async () => {
    askAiMock.mockRejectedValue(new Error("429"));
    renderCard();
    await act(async () => {
      screen.getByRole("button", { name: /Giải thích/ }).click();
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Giải thích AI đang bận, thử lại sau nhé!",
      ),
    );
    expect(screen.queryByText("…")).toBeNull();
  });
});
