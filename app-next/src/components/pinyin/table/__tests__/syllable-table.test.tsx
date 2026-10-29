import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyllableTable } from "../syllable-table";
import { SyllableDialog } from "../syllable-dialog";
import { _resetStaticAudioForTest } from "@/lib/tts/use-static-audio";

const speak = vi.fn();
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak, cancel: vi.fn(), speaking: false }),
}));

/* Fake Audio cho useStaticAudio — stub global Audio; singleton của hook là
   module-level nên reset qua _resetStaticAudioForTest trước mỗi test */
class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  playbackRate = 1;
  preservesPitch = true;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  private listeners = new Map<string, (() => void)[]>();
  constructor() {
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn));
  }
  dispatch(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

const lastAudio = () => FakeAudio.instances[FakeAudio.instances.length - 1];

beforeEach(() => {
  FakeAudio.instances = [];
  _resetStaticAudioForTest();
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SyllableDialog", () => {
  beforeEach(() => speak.mockClear());
  const cell = { initial: "b", final: "a", base: "ba", hasExample: true };
  it("hiện âm gốc, 5 nút thanh theo thứ tự", () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const dialog = within(screen.getByRole("dialog"));
    // 5 nút thanh đúng thứ tự tone 1→5 (nút có aria-pressed, loại "Nghe chậm")
    const toneButtons = dialog
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"));
    expect(
      toneButtons.map((b) => b.textContent?.replace(/Thanh (nhẹ|\d)/, "").trim()),
    ).toEqual(["bā", "bá", "bǎ", "bà", "ba"]);
  });
  it("click nút thanh phát mp3 tĩnh đúng file, không gọi TTS", async () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    await userEvent.click(within(screen.getByRole("dialog")).getByText("bǎ"));
    expect(lastAudio().src).toBe("/audio/pinyin/ba-3.mp3");
    expect(lastAudio().play).toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });
  it("file mp3 lỗi → fallback speak đúng thanh + rate 0.95", async () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    await userEvent.click(within(screen.getByRole("dialog")).getByText("bǎ"));
    await act(async () => {
      lastAudio().dispatch("error");
    });
    expect(speak).toHaveBeenCalledWith("bǎ", expect.objectContaining({ rate: 0.95 }));
  });
  it('"Nghe chậm" phát cùng file tone hiện tại rate 0.65, lỗi → fallback rate 0.65', async () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    await userEvent.click(within(screen.getByRole("dialog")).getByText("bǎ"));
    await userEvent.click(within(screen.getByRole("dialog")).getByText("Nghe chậm"));
    expect(lastAudio().src).toBe("/audio/pinyin/ba-3.mp3");
    expect(lastAudio().playbackRate).toBe(0.65);
    await act(async () => {
      lastAudio().dispatch("error");
    });
    expect(speak).toHaveBeenCalledWith("bǎ", expect.objectContaining({ rate: 0.65 }));
  });
  it("hiện ví dụ từ pinyinExamples (chữ Hán + nghĩa)", () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    expect(screen.getByText("八")).toBeInTheDocument();
    expect(screen.getByText("tám")).toBeInTheDocument();
  });
  it("âm không có ví dụ → không render mục ví dụ", () => {
    render(
      <SyllableDialog
        cell={{ initial: "Ø", final: "ueng", base: "weng", hasExample: false }}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText(/Ví dụ/i)).not.toBeInTheDocument();
  });
});

describe("SyllableTable", () => {
  beforeEach(() => {
    speak.mockClear();
    window.history.replaceState(null, "", "/pinyin/bang-am");
  });
  it("render 405 ô hợp lệ dạng nút (trong khung desktop)", () => {
    render(<SyllableTable />);
    // Desktop và mobile cùng render mỗi ô 2 lần (ẩn bằng CSS); jsdom không có
    // checkVisibility nên đếm trong container desktop (data-testid) để đếm đúng 405.
    const desktop = within(screen.getByTestId("syllable-table-desktop"));
    const buttons = desktop.getAllByRole("button", { name: /âm tiết/i });
    expect(buttons.length).toBe(405);
  });
  it("click ô ba mở dialog", async () => {
    render(<SyllableTable />);
    const desktop = within(screen.getByTestId("syllable-table-desktop"));
    await userEvent.click(desktop.getByRole("button", { name: "âm tiết ba" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("八")).toBeInTheDocument();
  });
  it("Esc đóng dialog và xoá ?sy khỏi URL", async () => {
    render(<SyllableTable />);
    const desktop = within(screen.getByTestId("syllable-table-desktop"));
    await userEvent.click(desktop.getByRole("button", { name: "âm tiết ba" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
  it("mount với ?sy=ba mở sẵn dialog, không tự phát audio", () => {
    window.history.replaceState(null, "", "/pinyin/bang-am?sy=ba");
    render(<SyllableTable />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });
});
