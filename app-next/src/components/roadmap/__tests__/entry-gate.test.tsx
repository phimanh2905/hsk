import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EntryGate } from "../entry-gate";

/* useTts mock — state subscribable để mô phỏng vòng đời speaking thật
   (true khi phát, false khi audio kết thúc) qua setSpeaking */
const tts = vi.hoisted(() => {
  const state = { speaking: false, listener: null as ((v: boolean) => void) | null };
  return {
    state,
    speak: vi.fn(),
    cancel: vi.fn(),
    setSpeaking(v: boolean) {
      state.speaking = v;
      state.listener?.(v);
    },
  };
});
vi.mock("@/lib/tts/use-tts", async () => {
  const { useState, useEffect } = await import("react");
  return {
    useTts: () => {
      const [speaking, setSpeaking] = useState(tts.state.speaking);
      useEffect(() => {
        tts.state.listener = setSpeaking;
        return () => {
          if (tts.state.listener === setSpeaking) tts.state.listener = null;
        };
      }, []);
      return { speak: tts.speak, cancel: tts.cancel, speaking };
    },
  };
});

const GATES_KEY = "bye.roadmap.gates.v1";

function answerQuestion(correct: boolean) {
  const opts = screen.getAllByTestId("gate-option");
  const target = opts.find((b) => b.getAttribute("data-correct") === (correct ? "true" : "false"))!;
  fireEvent.click(target);
  fireEvent.click(screen.getByRole("button", { name: /Câu tiếp|Xem kết quả/ }));
}

beforeEach(() => {
  localStorage.clear();
  tts.speak.mockReset();
  tts.cancel.mockReset();
  tts.setSpeaking(false);
  tts.state.listener = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EntryGate", () => {
  it("exempt: hiển thị đã miễn, không có nút bắt đầu", () => {
    render(<EntryGate status="exempt" />);
    expect(screen.getByText(/Đã miễn kiểm tra đầu vào/i)).toBeTruthy();
    expect(screen.getByText(/Bạn đã hoàn thành chặng Pinyin/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bắt đầu/i })).toBeNull();
  });

  it("open: card gọn 'Đã qua cổng đầu vào (N%)' theo pct đã lưu", () => {
    localStorage.setItem(
      "bye.roadmap.gates.v1",
      JSON.stringify({ hsk1: { pct: 85, at: 1 } }),
    );
    render(<EntryGate status="open" />);
    expect(screen.getByText(/Đã qua cổng đầu vào \(85%\)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bắt đầu/i })).toBeNull();
  });

  it("locked: 12 câu, đúng 10/12 (≥80%) → gọi onPass + ghi gate best-of", () => {
    const onPass = vi.fn();
    render(<EntryGate status="locked" onPass={onPass} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));

    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId("gate-counter")).toHaveTextContent(`Câu ${i + 1}/12`);
      answerQuestion(i < 10); // 10 câu đầu đúng, 2 câu cuối sai
    }

    expect(onPass).toHaveBeenCalledTimes(1);
    const gates = JSON.parse(localStorage.getItem(GATES_KEY)!);
    expect(gates["hsk1"].pct).toBe(83); // round(10/12*100)
    expect(screen.getByTestId("gate-result")).toHaveTextContent(/10\/12/);
  });

  it("dưới 80% → không gọi onPass, hiện thông báo làm lại", () => {
    const onPass = vi.fn();
    render(<EntryGate status="locked" onPass={onPass} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));

    for (let i = 0; i < 12; i++) answerQuestion(false);

    expect(onPass).not.toHaveBeenCalled();
    expect(screen.getByTestId("gate-result")).toHaveTextContent(/Chưa đạt 80%/);
    expect(screen.getByRole("button", { name: /Làm lại/i })).toBeTruthy();
  });

  it("mỗi câu speak(hanzi); TTS không phát sau 1.5s → fallback câu đọc 'Từ nào đọc là'", () => {
    render(<EntryGate status="locked" />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));
    expect(tts.speak).toHaveBeenCalled();

    // chưa tới 1.5s: câu nghe (options pinyin)
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Nghe/i);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // fallback: câu đọc với options hanzi
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Từ nào đọc là/i);
  });

  it("TTS phát được (speaking=true sau khi vào câu) → giữ câu nghe, không fallback", () => {
    render(<EntryGate status="locked" />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));
    // audio bắt đầu phát sau khi câu render (vòng đời thật)
    act(() => {
      tts.setSpeaking(true);
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Nghe/i);
    expect(screen.queryByText(/Từ nào đọc là/i)).toBeNull();
  });

  it("vòng đời TTS thật: speaking true (200ms) → false (500ms) → không replay, không fallback", () => {
    render(<EntryGate status="locked" />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));
    expect(tts.speak).toHaveBeenCalledTimes(1);

    // 200ms: audio bắt đầu phát
    act(() => {
      vi.advanceTimersByTime(200);
      tts.setSpeaking(true);
    });
    // 500ms: audio kết thúc
    act(() => {
      vi.advanceTimersByTime(300);
      tts.setSpeaking(false);
    });
    // qua mốc 1.5s: TTS đã phát được → KHÔNG fallback
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId("gate-prompt")).toHaveTextContent(/Nghe/i);
    expect(screen.queryByText(/Từ nào đọc là/i)).toBeNull();
    expect(tts.speak).toHaveBeenCalledTimes(1); // không phát lại audio
  });

  it("distractor unique: options pinyin và readOptions hanzi không trùng", async () => {
    const { buildGateQuestions } = await import("../entry-gate");
    for (let run = 0; run < 20; run++) {
      for (const q of buildGateQuestions()) {
        expect(new Set(q.options).size).toBe(4);
        expect(new Set(q.listen!.readOptions).size).toBe(4);
        // đáp án xuất hiện đúng 1 lần (distractor không trùng đáp án)
        expect(
          q.listen!.readOptions.filter((h) => h === q.listen!.audioText),
        ).toHaveLength(1);
      }
    }
  });

  it("distractor gần-âm: 20 vòng × 12 câu, ≥50% câu có ≥1 option cùng thanh mẫu", async () => {
    const { buildGateQuestions } = await import("../entry-gate");
    const { pinyinInitial } = await import("@/lib/station-quiz");
    const det = () => {
      let s = 42;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    };
    let hit = 0, total = 0;
    for (let run = 0; run < 20; run++) {
      for (const q of buildGateQuestions(det())) {
        total++;
        expect(new Set(q.options).size).toBe(4);
        expect(new Set(q.listen!.readOptions).size).toBe(4);
        const ansPinyin = q.options[q.answerIndex]!;
        const same = q.options.filter(
          (o) => o !== ansPinyin && pinyinInitial(o) === pinyinInitial(ansPinyin),
        ).length;
        if (same >= 1) hit++;
      }
    }
    expect(total).toBe(240);
    expect(hit / total).toBeGreaterThanOrEqual(0.5);
  });
});
