import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PronPanel from "../pron-panel";
import type { SubtitleSentence } from "@/content/shadowing";

/* Mock useRecorder: state điều khiển được qua biến module để test flip recording.
   stop() trả { secs: 3.2 } như record dock thật (stop() đồng bộ trả record). */
let mockRecording = false;
const mockStart = vi.fn(() => { mockRecording = true; });
const mockStop = vi.fn(() => { mockRecording = false; return { secs: 3.2 }; });
vi.mock("@/lib/shadowing/use-recorder", () => ({
  useRecorder: () => ({ recording: mockRecording, simMode: false, lastUrl: null, start: mockStart, stop: mockStop }),
}));

/* Mock scoreFor trả 82 — test contract là score đi qua hiển thị + recordPractice,
   không phụ thuộc công thức heuristic (ít giòn hơn dùng scoreFor thật). */
vi.mock("@/lib/shadowing/scoring", () => ({ scoreFor: vi.fn(() => 82) }));

const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "我没你们" }], pinyin: "wǒ méi nǐ men", vi: "Tôi không có các bạn" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "zàijiàn", vi: "Tạm biệt" },
];

function renderPanel({ cur = 0 }: { cur?: number } = {}) {
  const recordPractice = vi.fn();
  const view = render(
    <PronPanel subs={subs} cur={cur} rate={1} videoId="v1" recordPractice={recordPractice} />,
  );
  /* rerender cùng props — hook mock đọc biến module nên recording mới có tác dụng */
  const rerenderSame = () =>
    view.rerender(<PronPanel subs={subs} cur={cur} rate={1} videoId="v1" recordPractice={recordPractice} />);
  return { ...view, recordPractice, rerenderSame };
}

beforeEach(() => {
  mockRecording = false;
  mockStart.mockClear();
  mockStop.mockClear();
});

describe("PronPanel (Task 9)", () => {
  it("hiện câu active: pron-zh = parts câu cur, pron-py = pinyin", () => {
    renderPanel({ cur: 1 });
    expect(screen.getByTestId("pron-zh").textContent).toBe("再见");
    expect(screen.getByTestId("pron-py").textContent).toBe("zàijiàn");
  });

  it("click pron-record: chưa thu → start; recording → label DỪNG, click → stop + pron-score 82%", () => {
    const { rerenderSame } = renderPanel();
    const btn = screen.getByTestId("pron-record");
    fireEvent.click(btn);
    expect(mockStart).toHaveBeenCalledOnce();
    // flip recording state qua rerender (hook mock đọc biến module)
    rerenderSame();
    expect(screen.getByTestId("pron-record").textContent).toMatch(/DỪNG/);
    fireEvent.click(screen.getByTestId("pron-record"));
    expect(mockStop).toHaveBeenCalledOnce();
    expect(screen.getByTestId("pron-score").textContent).toContain("82%");
  });

  it("tip hiện 'nói rõ từng âm tiết'", () => {
    renderPanel();
    expect(screen.getByTestId("pron-tip").textContent).toMatch(/nói rõ từng âm tiết/i);
  });

  it("recordPractice gọi với { score: 82, secondsDelta: 3, linesDoneDelta: 1 }", () => {
    const { recordPractice, rerenderSame } = renderPanel();
    fireEvent.click(screen.getByTestId("pron-record"));
    rerenderSame();
    fireEvent.click(screen.getByTestId("pron-record"));
    expect(recordPractice).toHaveBeenCalledWith("v1", { score: 82, secondsDelta: 3, linesDoneDelta: 1 });
  });
});
