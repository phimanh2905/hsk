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

/* fixture arrange: có words (ShadowWord[]) — tiles ưu tiên từ words */
const subsWords: SubtitleSentence[] = [
  {
    n: 1,
    start: 0,
    end: 8,
    parts: [{ zh: "我没你们" }],
    words: [
      { zh: "我", py: "wǒ", startMs: 0, endMs: 500 },
      { zh: "没", py: "méi", startMs: 500, endMs: 1000 },
      { zh: "你们", py: "nǐmen", startMs: 1000, endMs: 2000 },
    ],
    pinyin: "wǒ méi nǐ men",
    vi: "Tôi không có các bạn",
  },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "zàijiàn", vi: "Tạm biệt" },
];

function renderArrange() {
  localStorage.setItem("bye.shadowing.dictVariant", "arrange");
  const eng = makeEng(0);
  const rec = vi.fn<(id: string, patch: { score?: number; linesDoneDelta?: number }) => void>();
  render(<DictationPanel subs={subsWords} cur={0} videoId="v1" eng={eng} recordPractice={rec} />);
  return { eng, recordPractice: rec, container: document.body };
}

function tileTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-testid="dict-arrange-tile"]')).map((el) => el.textContent);
}

function bankTiles(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-testid="dict-arrange-bank"] [data-testid="dict-arrange-tile"]')).map((el) => el.textContent);
}

function tileInBank(container: HTMLElement, zh: string): HTMLElement {
  const el = Array.from(container.querySelectorAll('[data-testid="dict-arrange-tile"]')).find(
    (e) => e.textContent === zh,
  );
  if (!el) throw new Error("tile not found in bank: " + zh);
  return el as HTMLElement;
}

describe("DictationPanel — variant Arrange (Task 8)", () => {
  it("render: dict-arrange-bank có N tile (N = words.length), variant-arrange pressed", () => {
    const { container } = renderArrange();
    expect(screen.getByTestId("dict-variant-arrange")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dict-arrange-bank")).toBeInTheDocument();
    expect(screen.queryByTestId("dict-input")).not.toBeInTheDocument();
    expect(tileTexts(container).length).toBe(3);
  });

  it("shuffle deterministic: thứ tự tile giống nhau giữa 2 render cùng seed", () => {
    localStorage.setItem("bye.shadowing.dictVariant", "arrange");
    const r1 = render(<DictationPanel subs={subsWords} cur={0} videoId="v1" eng={makeEng(0)} recordPractice={vi.fn()} />);
    const order1 = tileTexts(r1.container);
    r1.unmount();
    const r2 = render(<DictationPanel subs={subsWords} cur={0} videoId="v1" eng={makeEng(0)} recordPractice={vi.fn()} />);
    expect(tileTexts(r2.container)).toEqual(order1);
    r2.unmount();
  });

  it("tap tile → vào built; tap lại trong built → về bank", () => {
    const { container } = renderArrange();
    const zh = tileTexts(container)[0]!;
    fireEvent.click(screen.getByText(zh));
    expect(bankTiles(container).length).toBe(2); // bank còn 2
    expect(screen.getByTestId("dict-arrange-built").textContent).toContain(zh);
    fireEvent.click(screen.getByTestId("dict-arrange-built").querySelector('[data-testid="dict-arrange-tile"]')!);
    expect(bankTiles(container).length).toBe(3); // về lại bank đủ 3
    expect(screen.getByTestId("dict-arrange-built").textContent).not.toContain(zh);
  });

  it("ghép đúng thứ tự → check → reason 'Hoàn toàn chính xác', recordPractice {score:100}", () => {
    const { recordPractice, eng } = renderArrange();
    for (const zh of ["我", "没", "你们"]) fireEvent.click(tileInBank(document.body, zh));
    fireEvent.click(screen.getByTestId("dict-arrange-check"));
    expect(screen.getByTestId("dict-reason").textContent).toContain("Hoàn toàn chính xác");
    expect(recordPractice).toHaveBeenCalledWith("v1", { score: 100, linesDoneDelta: 1 });
    expect(eng.next).toHaveBeenCalled();
  });

  it("ghép sai thứ tự → check → dict-arrange-wrong + dict-badge-errors >= 1", () => {
    renderArrange();
    for (const zh of ["没", "我", "你们"]) fireEvent.click(tileInBank(document.body, zh));
    fireEvent.click(screen.getByTestId("dict-arrange-check"));
    expect(screen.getByTestId("dict-arrange-wrong")).toBeInTheDocument();
    const errors = Number(screen.getByTestId("dict-badge-errors").textContent?.replace(/\D/g, ""));
    expect(errors).toBeGreaterThanOrEqual(1);
  });

  it("đổi câu (cur) → built reset rỗng", () => {
    const eng = makeEng(0);
    localStorage.setItem("bye.shadowing.dictVariant", "arrange");
    const { rerender } = render(
      <DictationPanel subs={subsWords} cur={0} videoId="v1" eng={eng} recordPractice={vi.fn()} />,
    );
    fireEvent.click(tileInBank(document.body, "我"));
    expect(screen.getByTestId("dict-arrange-built").querySelectorAll('[data-testid="dict-arrange-tile"]').length).toBe(1);
    rerender(<DictationPanel subs={subsWords} cur={1} videoId="v1" eng={eng} recordPractice={vi.fn()} />);
    expect(screen.getByTestId("dict-arrange-built").querySelectorAll('[data-testid="dict-arrange-tile"]').length).toBe(0);
  });
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
