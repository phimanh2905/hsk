import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { forwardRef } from "react";
import ShadowingStudio from "../shadowing-studio";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import type { usePlayerEngine } from "@/components/shadowing/studio/use-player-engine";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

/* Mock react-player — render div mang src + config để assert, forward ref như thật. */
vi.mock("react-player", () => ({
  default: forwardRef(function MockReactPlayer(
    props: Record<string, unknown> & { src?: string; config?: unknown; onReady?: () => void; onError?: () => void },
    ref: React.Ref<HTMLDivElement>
  ) {
    return <div ref={ref} data-yt-src={props.src} data-config={JSON.stringify(props.config ?? null)} />;
  }),
}));

/* Engine fake có thể kiểm soát time/cur cho test karaoke — mặc định (override null)
   vẫn dùng engine thật để các test cũ không giòn. */
const engineOverride = vi.hoisted(() => ({ current: null as Partial<ReturnType<typeof usePlayerEngine>> | null }));
vi.mock("@/components/shadowing/studio/use-player-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/shadowing/studio/use-player-engine")>();
  const fake: ReturnType<typeof usePlayerEngine> = {
    cur: 0, playing: false, tts: false, ytReady: true, playerError: false, rate: 1, loop: false, time: 0, autoPause: false,
    setAutoPause: vi.fn(), play: vi.fn(), pause: vi.fn(), togglePlay: vi.fn(), gotoSentence: vi.fn(),
    next: vi.fn(), prev: vi.fn(), repeat: vi.fn(), setRate: vi.fn(), toggleLoop: vi.fn(),
    listenCurrent: vi.fn(), speakSentence: vi.fn(), markYtReady: vi.fn(), handlePlayerError: vi.fn(),
  };
  return {
    ...actual,
    usePlayerEngine: (args: Parameters<typeof usePlayerEngine>[0]) =>
      engineOverride.current ? { ...fake, ...engineOverride.current } : actual.usePlayerEngine(args),
  };
});

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
  it("stage render ReactPlayer với src youtube-nocookie + config youtube.origin", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    const p = document.querySelector("[data-yt-src]")!;
    expect(p.getAttribute("data-yt-src")).toContain("youtube-nocookie.com/embed/EA3rwvr99Q0");
    const cfg = JSON.parse(p.getAttribute("data-config")!);
    expect(cfg.youtube.rel).toBe(0);
    expect(typeof cfg.youtube.origin).toBe("string"); // window.location.origin sau mount
  });
  it("overlay lỗi: engine playerError → hiện video-error kèm link YouTube", () => {
    engineOverride.current = { playerError: true, ytReady: false };
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("video-error")).toBeInTheDocument();
    expect(screen.getByText(/Mở video trên YouTube/)).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=EA3rwvr99Q0"
    );
    expect(screen.queryByTestId("video-overlay")).not.toBeInTheDocument();
    engineOverride.current = null;
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
  it("mỗi câu render data-sent, câu active có sent-active, click câu seek qua playerRef", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    const s0 = document.querySelector('[data-sent="0"]')!;
    const s1 = document.querySelector('[data-sent="1"]')!;
    expect(s0).toHaveClass("sent-active");
    expect(s1).not.toHaveClass("sent-active");
    fireEvent.click(s1);
    // engine thật: gotoSentence gán currentTime = start câu 1 lên media element (mock ref)
    const player = document.querySelector("[data-yt-src]") as HTMLElement & { currentTime?: number };
    expect(player.currentTime).toBe(subs[1].start);
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

describe("Task 10 — karaoke word highlight + toggle tự ngắt câu", () => {
  const subsWithWords: SubtitleSentence[] = [
    {
      n: 1, start: 0, end: 8, parts: [{ zh: "你好" }, { zh: "吗" }], pinyin: "Nǐ hǎo ma", vi: "Bạn có khỏe không",
      words: [
        { zh: "你", py: "nǐ", startMs: 0, endMs: 500 },
        { zh: "好", py: "hǎo", startMs: 500, endMs: 1200 },
        { zh: "吗", py: "ma", startMs: 1200, endMs: 1800 },
      ],
    },
    { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
  ];
  beforeEach(() => {
    engineOverride.current = null;
    try { localStorage.removeItem("bye.shadowing.autoPause"); } catch { /* jsdom ok */ }
  });

  it("không có words → không render toggle auto-pause và không kw span", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.queryByTestId("auto-pause")).toBeNull();
    expect(document.querySelectorAll('[data-testid="kw"]').length).toBe(0);
  });

  it("có words → toggle auto-pause hiện, aria-pressed flip + ghi localStorage (engine thật)", () => {
    render(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    const tgl = screen.getByTestId("auto-pause");
    expect(tgl).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(tgl);
    expect(tgl).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("bye.shadowing.autoPause")).toBe("1");
    fireEvent.click(tgl);
    expect(tgl).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("bye.shadowing.autoPause")).toBe("0");
  });

  it("câu active render kw spans theo eng.time — từ đang phát có data-active=1 (engine fake)", () => {
    engineOverride.current = { cur: 0, time: 0.3, ytReady: true };
    const { rerender } = render(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    const kws = document.querySelectorAll('[data-testid="kw"]');
    expect(kws.length).toBe(3);
    expect(kws[0].getAttribute("data-active")).toBe("1");
    expect(kws[1].getAttribute("data-active")).toBe("0");
    // time 0.8s → từ thứ 2 đang phát
    engineOverride.current = { cur: 0, time: 0.8, ytReady: true };
    rerender(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    const kws2 = document.querySelectorAll('[data-testid="kw"]');
    expect(kws2[0].getAttribute("data-active")).toBe("0");
    expect(kws2[1].getAttribute("data-active")).toBe("1");
  });

  it("từ đang phát dùng utility token highlight (bg-jade-wash text-action-primary)", () => {
    engineOverride.current = { cur: 0, time: 0.3, ytReady: true };
    render(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    const active = document.querySelector('[data-testid="kw"][data-active="1"]')!;
    expect(active).toHaveClass("bg-jade-wash", "text-action-primary");
  });

  it("câu khác active / không words → render parts như cũ", () => {
    engineOverride.current = { cur: 1, time: 10, ytReady: true };
    render(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    // câu 0 không active dù có words → không kw
    expect(document.querySelectorAll('[data-testid="kw"]').length).toBe(0);
    expect(document.querySelector('[data-sent="0"] [data-part="0"]')).not.toBeNull();
  });

  it("mode dict → dict-box từ panel; mode pron → pron-box (testid pron-box của PronPanel)", () => {
    render(<ShadowingStudio video={video} subtitles={subsWithWords} />);
    fireEvent.click(screen.getByTestId("mode-dict"));
    expect(screen.getByTestId("dict-box")).toBeVisible();
    fireEvent.click(screen.getByTestId("mode-pron"));
    expect(screen.getByTestId("pron-box")).toBeVisible();
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
