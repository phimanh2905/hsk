import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ReadingDoc } from "@/lib/content/readings";
import type { ReadingPlayerApi } from "../use-reading-player";
import { ReadingPlayer } from "../reading-player";

/* Mock hook: trả state cố định + spies. Muốn đổi state, mutate `overrides.value`. */
const hookMock = vi.hoisted(() => ({ useReadingPlayer: vi.fn() }));
vi.mock("../use-reading-player", () => ({ useReadingPlayer: hookMock.useReadingPlayer }));

const makeApi = (overrides: Partial<ReadingPlayerApi> = {}): ReadingPlayerApi => ({
  playing: false,
  curIdx: 0,
  charPos: null,
  rate: 1,
  loopSentence: false,
  curTime: 0,
  duration: 4,
  hasAudio: true,
  toggle: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  seekSentence: vi.fn(),
  seekGlobal: vi.fn(),
  setRate: vi.fn(),
  setLoopSentence: vi.fn(),
  ...overrides,
});

const overrides: { value: Partial<ReadingPlayerApi> } = { value: {} };
vi.mocked(hookMock.useReadingPlayer).mockImplementation(() => makeApi(overrides.value));

const onComplete = vi.fn();

const doc: ReadingDoc = {
  id: "r1",
  level: "hsk1",
  ord: 0,
  title: "你好",
  titleVi: "Xin chào",
  sentences: [
    { zh: "你好。", py: "Nǐ hǎo.", vi: "Xin chào.", audio: "1.mp3", durSec: 2 },
    { zh: "再见。", py: "Zàijiàn.", vi: "Tạm biệt.", audio: null, durSec: 2 },
  ],
  vocab: [],
  questions: [
    {
      q: "你好吗？",
      qVi: "Bạn có khỏe không?",
      options: ["你好。", "再见。", "谢谢。", "对不起。"],
      answer: 0,
      evidence: [{ si: 0, s: 0, e: 2 }],
    },
    {
      q: "告别说什么？",
      qVi: "Khi chào tạm biệt nói gì?",
      options: ["你好。", "谢谢。", "再见。", "对不起。"],
      answer: 2,
      evidence: [{ si: 1, s: 0, e: 2 }],
    },
  ],
  audioDir: "audio/reading/r1",
  chars: 4,
  durationSec: 4,
};

function setup(overridesIn: Partial<ReadingPlayerApi> = {}) {
  overrides.value = overridesIn;
  return render(<ReadingPlayer doc={doc} onComplete={onComplete} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ReadingPlayer", () => {
  it("render bài + map audio URL đầy đủ + toolbar điều khiển", () => {
    const { container } = setup();
    const s0 = container.querySelector('[data-sentence="0"]');
    const s1 = container.querySelector('[data-sentence="1"]');
    expect(s0).toHaveTextContent("你好。");
    expect(s1).toHaveTextContent("再见。");
    // câu đầu highlight khi curIdx === 0
    expect(s0).toHaveClass("font-semibold");

    // hook nhận sentences với audio ghép từ audioDir
    const sentences = hookMock.useReadingPlayer.mock.calls.at(-1)?.[0];
    expect(sentences[0].audio).toBe("/audio/reading/r1/1.mp3");
    expect(sentences[1].audio).toBeNull();

    // prev/play/next gọi spies
    const api = hookMock.useReadingPlayer.mock.results.at(-1)?.value as ReadingPlayerApi;
    fireEvent.click(screen.getByRole("button", { name: "Câu trước" }));
    expect(api.prev).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Phát" }));
    expect(api.toggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Câu sau" }));
    expect(api.next).toHaveBeenCalledTimes(1);

    // click câu → seekSentence(i)
    fireEvent.click(s1!);
    expect(api.seekSentence).toHaveBeenCalledWith(1);
  });

  it("toggle 拼 Pinyin và Dịch + lưu localStorage", () => {
    setup();
    expect(screen.queryByText("Nǐ hǎo.")).not.toBeInTheDocument();
    expect(screen.queryByText("Xin chào.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /拼 Pinyin/ }));
    expect(screen.getByText("Nǐ hǎo.")).toBeInTheDocument();
    expect(screen.getByText("Zàijiàn.")).toBeInTheDocument();
    expect(localStorage.getItem("nhai.reading.pinyin")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Dịch" }));
    expect(screen.getByText("Xin chào.")).toBeInTheDocument();
    expect(screen.getByText("Tạm biệt.")).toBeInTheDocument();
  });

  it("chọn đúng → bg-jade-wash, sai → bg-rose-wash + tô đáp án đúng + khóa chọn", () => {
    setup();
    const q0 = screen.getByTestId("question-0");
    const q1 = screen.getByTestId("question-1");

    // Q1: chọn đúng
    fireEvent.click(within(q0).getByRole("button", { name: "你好。" }));
    expect(within(q0).getByRole("button", { name: "你好。" })).toHaveClass("bg-jade-wash");

    // Q2: chọn sai → nút chọn bg-rose-wash, đáp án đúng được tô
    fireEvent.click(within(q1).getByRole("button", { name: "你好。" }));
    expect(within(q1).getByRole("button", { name: "你好。" })).toHaveClass("bg-rose-wash");
    expect(within(q1).getByRole("button", { name: "再见。" })).toHaveClass("bg-jade-wash");

    // khóa chọn
    fireEvent.click(within(q1).getByRole("button", { name: "谢谢。" }));
    expect(within(q1).getByRole("button", { name: "谢谢。" })).not.toHaveClass("bg-rose-wash");
  });

  it("evidence mark xuất hiện sau khi chọn + scrollIntoView mark đầu", () => {
    setup();
    expect(screen.queryByTestId("evidence-mark")).not.toBeInTheDocument();

    const q0 = screen.getByTestId("question-0");
    fireEvent.click(within(q0).getByRole("button", { name: "你好。" }));

    const mark = screen.getByTestId("evidence-mark");
    expect(mark).toHaveTextContent("你好");
    expect(mark).toHaveClass("bg-amber-wash/60");
    expect(mark.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("Làm lại reset quiz; onComplete gọi đúng 1 lần per mount", () => {
    setup();
    const q0 = screen.getByTestId("question-0");
    const q1 = screen.getByTestId("question-1");

    fireEvent.click(within(q0).getByRole("button", { name: "你好。" })); // Q1 đúng
    fireEvent.click(within(q1).getByRole("button", { name: "再见。" })); // Q2 đúng
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(2, 2);

    fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
    expect(within(q0).getByRole("button", { name: "你好。" })).not.toHaveClass("bg-jade-wash");
    expect(screen.queryByTestId("evidence-mark")).not.toBeInTheDocument();

    // làm lại hết → không gọi onComplete lần nữa
    fireEvent.click(within(q0).getByRole("button", { name: "你好。" }));
    fireEvent.click(within(q1).getByRole("button", { name: "再见。" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("seek slider ẩn khi !hasAudio, hiện khi có audio + label thời gian m:ss", () => {
    const first = setup();
    expect(within(first.container).getByRole("slider", { name: "Tua" })).toBeInTheDocument();
    expect(within(first.container).getByText("0:00 / 0:04")).toBeInTheDocument();
    first.unmount();

    overrides.value = { hasAudio: false };
    const second = render(<ReadingPlayer doc={doc} onComplete={onComplete} />);
    expect(within(second.container).queryByRole("slider", { name: "Tua" })).not.toBeInTheDocument();
    expect(within(second.container).getByText("0:00 / 0:04")).toBeInTheDocument();
  });

  it("tốc độ xoay vòng (1 → 1.25) và Loop toggle gọi spy", () => {
    setup();
    const api = hookMock.useReadingPlayer.mock.results.at(-1)?.value as ReadingPlayerApi;
    fireEvent.click(screen.getByRole("button", { name: "1x" }));
    expect(api.setRate).toHaveBeenCalledWith(1.25);
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));
    expect(api.setLoopSentence).toHaveBeenCalledWith(true);
  });
});
