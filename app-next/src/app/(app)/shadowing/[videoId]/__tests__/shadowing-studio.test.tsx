import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShadowingStudio from "../shadowing-studio";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

const video: ShadowingVideo = {
  id: "EA3rwvr99Q0", title: "墓碑上的QR碼", playlistId: "daihuaxiyou", hsk: "HSK3",
  views: 0, viewsSuffix: "", duration: "2:46", durSec: 166, plays: 0, topic: "film", spd: 0.9,
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

describe("transcript + dictation (port script-tabs/transcript-stream/dictation-box)", () => {
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
