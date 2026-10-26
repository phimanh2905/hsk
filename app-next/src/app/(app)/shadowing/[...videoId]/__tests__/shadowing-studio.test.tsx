import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShadowingStudio from "../shadowing-studio";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

const video: ShadowingVideo = {
  id: "EA3rwvr99Q0", title: "墓碑上的QR碼", playlistId: "daihuaxiyou", hsk: "HSK3",
  views: 0, viewsSuffix: "", duration: "2:46", durSec: 166, plays: 0, topic: "film", spd: 0.9, type: "youtube", audioDir: null,
};
const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "你好" }], pinyin: "Nǐ hǎo", vi: "Xin chào" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
];

describe("ShadowingStudio — shell (port studio-topbar/video-stage/player-toolbar)", () => {
  it("render topbar: back link, title, tiến độ nói", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("studio-topbar")).toBeInTheDocument();
    expect(screen.getByText("Thư viện Shadowing")).toHaveAttribute("href", "/shadowing");
    expect(screen.getByText(/Tiến độ nói/)).toBeInTheDocument();
    expect(screen.getByText("Câu 1/2")).toBeInTheDocument();
  });
  it("stage có iframe YouTube + overlay khi chưa ready", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    const iframe = screen.getByTitle(/YouTube video player/);
    expect(iframe).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/EA3rwvr99Q0"));
  });
  it("player toolbar: play, scrub, lặp câu, speed seg 0.75/0.85/1.0, CC", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("player-toolbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát / tạm dừng" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lặp câu/ })).toBeInTheDocument();
    for (const s of ["0.75x", "0.85x", "1.0x"]) expect(screen.getByRole("button", { name: s })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CC" })).toBeInTheDocument();
  });
});

describe("transcript + dictation (mode 3 tab: Shadow/Chép chính tả/Phát âm)", () => {
  it("mỗi câu render data-sent, câu active có sent-active, click câu gọi seekTo", () => {
    const postSink = vi.fn();
    render(<ShadowingStudio video={video} subtitles={subs} enginePostSink={postSink} />);
    const s0 = document.querySelector('[data-sent="0"]')!;
    const s1 = document.querySelector('[data-sent="1"]')!;
    expect(s0).toHaveClass("sent-active");
    expect(s1).not.toHaveClass("sent-active");
    fireEvent.click(s1);
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"seekTo"'));
  });
  it("tab Chép chính tả → hiện dictation box, ẩn stream; check đúng → điểm ghi nhận", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    expect(screen.getByTestId("dict-box")).toBeVisible();
    expect(screen.getByTestId("transcript-stream")).not.toBeVisible();
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "你好" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    expect(screen.getByTestId("dict-result")).toHaveTextContent(/Chính xác/);
  });
  it("ô trống chips: mask ? rồi mở dần khi bấm Gợi ý", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    const masked = screen.getAllByText("?").length;
    expect(masked).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Gợi ý 1 chữ" }));
    expect(screen.getAllByText("?").length).toBe(masked - 1);
  });
});

describe("mode switch — 3 tab Shadow/Dict/Pron + phím Digit1/2/3 (Task 6)", () => {
  it("render 3 tab mode-shadow/mode-dict/mode-pron, mặc định shadow active", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    const shadow = screen.getByTestId("mode-shadow");
    expect(shadow).toHaveAttribute("aria-pressed", "true");
    expect(shadow).toHaveTextContent("Shadow");
    expect(screen.getByTestId("mode-dict")).toHaveTextContent("Chép chính tả");
    expect(screen.getByTestId("mode-pron")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("transcript-stream")).toBeVisible();
  });

  it("click mode-dict → dict-box hiện, transcript ẩn, dock mờ", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByTestId("mode-dict"));
    expect(screen.getByTestId("mode-dict")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dict-box")).toBeVisible();
    expect(screen.getByTestId("transcript-stream")).not.toBeVisible();
    expect(screen.getByTestId("record-dock")).toHaveClass("opacity-45", "saturate-50");
  });

  it("click mode-pron → chỉ flip state (aria-pressed), dock KHÔNG mờ, dict/transcript ẩn, không render panel pron", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByTestId("mode-pron"));
    expect(screen.getByTestId("mode-pron")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("transcript-stream")).not.toBeVisible();
    expect(screen.getByTestId("dict-box")).not.toBeVisible();
    expect(screen.getByTestId("record-dock")).not.toHaveClass("opacity-45");
  });

  it("phím Digit1/2/3 đổi mode; Digit3 → tab Phát âm active", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.keyDown(document, { code: "Digit2" });
    expect(screen.getByTestId("mode-dict")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(document, { code: "Digit3" });
    expect(screen.getByTestId("mode-pron")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(document, { code: "Digit1" });
    expect(screen.getByTestId("mode-shadow")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("transcript-stream")).toBeVisible();
  });

  it("phím Digit bỏ qua khi đang gõ trong textarea dictation", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByTestId("mode-dict"));
    const input = screen.getByTestId("dict-input");
    input.focus();
    fireEvent.keyDown(input, { code: "Digit3" });
    expect(screen.getByTestId("mode-dict")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(input, { code: "Digit1" });
    expect(screen.getByTestId("mode-shadow")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("waveform + record dock (port waveform-card/record-dock)", () => {
  it("render 2 canvas rows + nút Nghe mẫu / Phát lại + mic", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("waveform-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe mẫu" })).toBeInTheDocument();
    expect(screen.getByTestId("wave-mine-empty")).toHaveTextContent(/Chưa có bản ghi/);
    expect(screen.getByRole("button", { name: "Nhấn giữ để thu âm" })).toBeInTheDocument();
  });
  it("Space giữ → recording, Space nhả → dừng và chấm (simMode jsdom)", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.keyDown(document, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyUp(document, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "false");
  });
  it("Space bỏ qua khi focus trong textarea dictation", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    const input = screen.getByTestId("dict-input");
    input.focus();
    fireEvent.keyDown(input, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "false");
  });
  it("tab dict → dock mờ", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    expect(screen.getByTestId("record-dock")).toHaveClass("opacity-45", "saturate-50");
  });
});

describe("T7 — chế độ audio (video.type === 'audio')", () => {
  const audioVideo: ShadowingVideo = {
    ...video, id: "hsk1/lesson-1", type: "audio", audioDir: "audio/shadowing/hsk1/lesson-1",
  };
  it("render <audio data-testid='audio-player'> theo câu, KHÔNG iframe YouTube", () => {
    render(<ShadowingStudio video={audioVideo} subtitles={subs} />);
    const audio = screen.getByTestId("audio-player");
    expect(audio).toHaveAttribute("src", "/audio/shadowing/hsk1/lesson-1-1.mp3");
    expect(screen.queryByTitle(/YouTube video player/)).toBeNull();
    expect(screen.queryByTestId("video-overlay")).toBeNull();
  });
  it("chuyển câu → src clip đổi theo câu hiện tại", () => {
    render(<ShadowingStudio video={audioVideo} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Câu tiếp theo ▶" }));
    expect(screen.getByTestId("audio-player")).toHaveAttribute("src", "/audio/shadowing/hsk1/lesson-1-2.mp3");
  });
  it("audio 404 → thông báo 'Audio đang được tạo'", () => {
    render(<ShadowingStudio video={audioVideo} subtitles={subs} />);
    fireEvent.error(screen.getByTestId("audio-player"));
    expect(screen.getByTestId("audio-missing")).toHaveTextContent(/Audio đang được tạo/);
  });
});
