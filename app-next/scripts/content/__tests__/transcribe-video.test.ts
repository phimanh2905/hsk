import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flattenWhisperJson, transcribeVideo, PY_SEGMENT_SNIPPET } from "../transcribe-video";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
  default: { execFile: execFileMock },
}));

const WHISPER_JSON = JSON.stringify({
  transcription: [
    { timestamps: { from: "00:00:00.000", to: "00:00:00.400" }, offsets: { from: 0, to: 400 }, text: " 你好" },
    { timestamps: { from: "00:00:00.400", to: "00:00:00.700" }, offsets: { from: 400, to: 700 }, text: "世界" },
    { timestamps: { from: "00:00:00.700", to: "00:00:00.800" }, offsets: { from: 700, to: 800 }, text: "。" },
  ],
});

describe("flattenWhisperJson", () => {
  it("đổi ms → giây, giữ text", () => {
    const toks = flattenWhisperJson(WHISPER_JSON);
    expect(toks).toEqual([
      { text: "你好", start: 0, end: 0.4 },
      { text: "世界", start: 0.4, end: 0.7 },
      { text: "。", start: 0.7, end: 0.8 },
    ]);
  });

  it("bỏ token rỗng/khoảng trắng", () => {
    const toks = flattenWhisperJson(
      JSON.stringify({ transcription: [{ offsets: { from: 0, to: 100 }, text: "  " }, { offsets: { from: 100, to: 200 }, text: "好" }] })
    );
    expect(toks).toEqual([{ text: "好", start: 0.1, end: 0.2 }]);
  });
});

describe("PY_SEGMENT_SNIPPET", () => {
  it("dùng lazy_pinyin và đọc file từ argv", () => {
    expect(PY_SEGMENT_SNIPPET).toContain("lazy_pinyin");
    expect(PY_SEGMENT_SNIPPET).toContain("argv");
  });
});

describe("transcribeVideo (mocked child_process)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "transcribe-test-"));
    execFileMock.mockReset();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("chạy yt-dlp → whisper → python, trả câu đã tách + pinyin", async () => {
    execFileMock.mockImplementation((cmd: string, args: string[], _opts: unknown, cb?: unknown) => {
      const callback = (typeof cb === "function" ? cb : _opts) as (err: Error | null, stdout?: string) => void;
      if (cmd.endsWith("yt-dlp")) {
        // yt-dlp: không output — audio đã "tải" (mock, không network)
        callback(null, "");
      } else if (cmd === "whisper-cli") {
        // whisper-cli -ojf: ghi whisper.json cạnh -of (mô phỏng output thật)
        const ofIdx = args.indexOf("-of");
        const outBase = ofIdx >= 0 ? args[ofIdx + 1] : join(dir, "whisper");
        import("node:fs/promises")
          .then((fs) => fs.writeFile(`${outBase}.json`, WHISPER_JSON, "utf8"))
          .then(() => callback(null, ""))
          .catch((e) => callback(e as Error));
      } else if (cmd.includes("python")) {
        // python pypinyin: snippet đọc words.json (argv[1]) — mock trả pinyin aligned theo câu
        callback(null, JSON.stringify([{ zh: "你好世界。", py: ["nǐ", "hǎo", "shì", "jiè"] }]));
      } else {
        callback(new Error(`unexpected cmd: ${cmd}`));
      }
    });

    const sentences = await transcribeVideo("TESTID12345", { outDir: dir });
    expect(sentences).toEqual([
      { zh: "你好世界。", start: 0, end: 0.8, words: { zh: "你好世界。", py: ["nǐ", "hǎo", "shì", "jiè"] } },
    ]);
    // yt-dlp được gọi với đúng video URL
    const ytCall = execFileMock.mock.calls.find((c) => String(c[0]).endsWith("yt-dlp"));
    expect(JSON.stringify(ytCall?.[1])).toContain("youtube.com/watch?v=TESTID12345");
    // whisper-cli ghi JSON vào out/<id>/
    const wCall = execFileMock.mock.calls.find((c) => c[0] === "whisper-cli");
    expect(JSON.stringify(wCall?.[1])).toContain("whisper");
    // pinyin.json trung gian đã ghi
    expect(JSON.parse(await readFile(join(dir, "TESTID12345", "pinyin.json"), "utf8"))).toEqual([
      { zh: "你好世界。", py: ["nǐ", "hǎo", "shì", "jiè"] },
    ]);
  });

  it("ném lỗi khi command fail", async () => {
    execFileMock.mockImplementation((cmd: string, _args: string[], _opts: unknown, cb?: unknown) => {
      const callback = (typeof cb === "function" ? cb : _opts) as (err: Error | null, stdout?: string) => void;
      if (cmd.endsWith("yt-dlp")) callback(new Error("network down"));
    });
    await expect(transcribeVideo("TESTID12345", { outDir: dir })).rejects.toThrow(/yt-dlp failed/);
  });

  it.skip("e2e thật — chạy manual, không trong CI", () => {});
});
