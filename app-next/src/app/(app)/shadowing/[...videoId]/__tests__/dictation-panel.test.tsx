import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DictationPanel from "../dictation-panel";
import { progressStore } from "@/lib/store/progress-store";
import type { SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "我没你们" }], pinyin: "wǒ méi nǐ men", vi: "Tôi không có các bạn" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "zàijiàn", vi: "Tạm biệt" },
];

function makeEng(cur = 0) {
  return { cur, listenCurrent: vi.fn(), prev: vi.fn(), next: vi.fn() };
}

function renderPanel({ cur = 0, recordPractice }: { cur?: number; recordPractice?: (id: string, patch: { score?: number; linesDoneDelta?: number }) => void } = {}) {
  const eng = makeEng(cur);
  const rec = recordPractice ?? vi.fn<(id: string, patch: { score?: number; linesDoneDelta?: number }) => void>();
  render(<DictationPanel subs={subs} cur={cur} videoId="v1" eng={eng} recordPractice={rec} />);
  return { eng, recordPractice: rec };
}

beforeEach(() => {
  localStorage.clear();
});

describe("DictationPanel — variant Typing (Task 7)", () => {
  it("mặc định variant = localStorage (typing) → dict-variant-typing aria-pressed=true", () => {
    renderPanel();
    expect(screen.getByTestId("dict-variant-typing")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dict-variant-arrange")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("dict-box")).toBeInTheDocument();
  });

  it("gõ sai 1 chữ → dict-diff 4 span dict-ok/dict-bad, badge lỗi chứa 1, reason chứa 'lỗi'", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "我妹你们" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    const diff = screen.getByTestId("dict-diff");
    const spans = diff.querySelectorAll("span");
    expect(spans.length).toBe(4);
    expect(spans[0].className).toContain("dict-ok");
    expect(spans[1].className).toContain("dict-bad");
    expect(screen.getByTestId("dict-badge-errors").textContent).toContain("1");
    expect(screen.getByTestId("dict-reason").textContent).toContain("lỗi");
  });

  it("gõ đúng nguyên văn → reason 'Hoàn toàn chính xác', recordPractice({score:100, linesDoneDelta:1})", () => {
    const { recordPractice } = renderPanel();
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "我没你们" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    expect(screen.getByTestId("dict-reason").textContent).toContain("Hoàn toàn chính xác");
    expect(recordPractice).toHaveBeenCalledWith("v1", { score: 100, linesDoneDelta: 1 });
  });

  it("check lần 2 cùng câu → dict-badge-last 'Điểm lần trước' = điểm lần check trước", async () => {
    renderPanel();
    // lần 1: sai 1 chữ (我妹你们) → score 75
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "我妹你们" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    expect(screen.getByTestId("dict-badge-last").textContent).toContain("75");
    // lần 2: đúng → badge vẫn hiện điểm lần trước (75), không phải 100
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "我没你们" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    expect(screen.getByTestId("dict-badge-last").textContent).toContain("Điểm lần trước");
    expect(screen.getByTestId("dict-badge-last").textContent).toContain("75");
    await waitFor(() => expect(screen.getByTestId("dict-reason").textContent).toContain("Hoàn toàn chính xác"));
  });

  it("dict-listen → recordReplay được gọi + eng.listenCurrent được gọi", () => {
    const replaySpy = vi.spyOn(progressStore, "recordReplay");
    const { eng } = renderPanel();
    fireEvent.click(screen.getByTestId("dict-listen"));
    expect(replaySpy).toHaveBeenCalledWith("v1", 1);
    expect(eng.listenCurrent).toHaveBeenCalled();
    replaySpy.mockRestore();
  });

  it("dict-hint click 1 lần → 1 ô hiện chữ đầu, còn lại '?'", () => {
    renderPanel();
    expect(screen.getAllByText("?").length).toBe(4);
    fireEvent.click(screen.getByTestId("dict-hint"));
    expect(screen.getAllByText("?").length).toBe(3);
    expect(screen.getByText("我")).toBeInTheDocument();
  });

  it("dict-next gọi eng.next", () => {
    const { eng } = renderPanel();
    fireEvent.click(screen.getByTestId("dict-next"));
    expect(eng.next).toHaveBeenCalled();
  });

  it("click dict-variant-arrange → localStorage bye.shadowing.dictVariant = 'arrange'", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("dict-variant-arrange"));
    expect(localStorage.getItem("bye.shadowing.dictVariant")).toBe("arrange");
    expect(screen.getByTestId("dict-variant-arrange")).toHaveAttribute("aria-pressed", "true");
  });
});
