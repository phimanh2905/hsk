import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { StudioWorkbench } from "../studio-workbench";
import type { StudioGridApi } from "../studio-grid";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";
import { ToastProvider } from "@/components/shell/toast-provider";

const rad = RADICAL_INDEX.find((r) => r.char === "水")!;
const mei = CHAR_META["没"];

const askAiMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai-client", () => ({ askAi: askAiMock }));

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: vi.fn(), speaking: false }),
}));
vi.mock("../writer-data", () => ({
  loadWriterCharData: vi.fn(async () => null),
  clearWriterDataCache: vi.fn(),
}));

beforeEach(() => {
  askAiMock.mockReset();
});

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioWorkbench>[0]> = {}) => {
  const apiRef = createRef<StudioGridApi | null>();
  const utils = render(
    <ToastProvider>
      <StudioWorkbench
        data={{ kind: "char", meta: mei, rad, meaning: "chưa / chìm" }}
        mode="watch"
        onMode={() => {}}
        apiRef={apiRef}
        hasStrokeData
        onSelectTray={() => {}}
        {...over}
      />
    </ToastProvider>,
  );
  return utils;
};

describe("StudioWorkbench — Chấm viết AI (Wave 7 T5)", () => {
  it("char: hiện mục Chấm viết; nhập câu chứa glyph → Chấm → askAi với glyph + câu + meaning", async () => {
    askAiMock.mockResolvedValue("Câu đúng rồi!");
    const user = userEvent.setup();
    const utils = setup();
    const ta = document.querySelector("textarea[data-writing-input]") as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
    await user.type(ta, "我没有钱。");
    await user.click(utils.getByRole("button", { name: "Chấm" }));
    expect(askAiMock).toHaveBeenCalledTimes(1);
    const messages = askAiMock.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(messages[0].content).toContain("没");
    expect(messages[0].content).toContain("我没有钱。");
    expect(messages[0].content).toContain("chưa / chìm");
    await waitFor(() => expect(utils.getByText("Câu đúng rồi!")).toBeTruthy());
  });

  it("rad: không hiện mục Chấm viết", () => {
    const apiRef = createRef<StudioGridApi | null>();
    render(
      <ToastProvider>
        <StudioWorkbench
          data={{ kind: "rad", rad }}
          mode="watch"
          onMode={() => {}}
          apiRef={apiRef}
          hasStrokeData
          onSelectTray={() => {}}
        />
      </ToastProvider>,
    );
    expect(document.querySelector("textarea[data-writing-input]")).toBeNull();
  });

  it("askAi reject → toast 'Chấm viết tạm thời không khả dụng'", async () => {
    askAiMock.mockRejectedValue(new Error("502"));
    const user = userEvent.setup();
    const utils = setup();
    const ta = document.querySelector("textarea[data-writing-input]") as HTMLTextAreaElement;
    await user.type(ta, "没去学校。");
    await act(async () => {
      utils.getByRole("button", { name: "Chấm" }).click();
    });
    await waitFor(() =>
      expect(utils.getByRole("status")).toHaveTextContent(
        "Chấm viết tạm thời không khả dụng",
      ),
    );
  });

  it("đang chấm → hiện '…'; xong → kết quả thay '…'", async () => {
    let resolve!: (v: string) => void;
    askAiMock.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    const user = userEvent.setup();
    const utils = setup();
    const ta = document.querySelector("textarea[data-writing-input]") as HTMLTextAreaElement;
    await user.type(ta, "没时间。");
    await user.click(utils.getByRole("button", { name: "Chấm" }));
    expect(utils.getByText("…")).toBeTruthy();
    await act(async () => {
      resolve("Dùng 没 đúng.");
    });
    await waitFor(() => expect(utils.getByText("Dùng 没 đúng.")).toBeTruthy());
    expect(utils.queryByText("…")).toBeNull();
  });
});
