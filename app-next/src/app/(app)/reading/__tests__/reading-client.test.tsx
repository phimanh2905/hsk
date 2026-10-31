import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingClient from "../reading-client";
import type { ReadingDoc } from "@/lib/content/readings";
import { progressStore } from "@/lib/store/progress-store";

/* Task 9 plan 2026-10-30-reading-library: library UI test.
   Mock loadReadings (readings-client — có test riêng), mock useReadingPlayer
   (hook có test riêng) để tránh Audio/speechSynthesis trong jsdom. */

const fixture: ReadingDoc[] = [
  {
    id: "hsk1-reading-1", level: "hsk1", ord: 1,
    title: "我的家", titleVi: "Gia đình tôi",
    sentences: [
      { zh: "我家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh.", audio: null, durSec: 3 },
      { zh: "我家有四口人。", py: "Wǒ jiā yǒu sì kǒu rén.", vi: "Nhà tôi có bốn người.", audio: null, durSec: 4 },
    ],
    vocab: [{ word: "家", py: "jiā", vi: "nhà" }],
    questions: [
      { q: "我家有几口人？", qVi: "Nhà tôi có mấy người?", options: ["三口", "四口", "五口", "六口"], answer: 1, evidence: [{ si: 1, s: 0, e: 6 }] },
      { q: "我家在哪里？", qVi: "Nhà tôi ở đâu?", options: ["上海", "北京", "广州", "深圳"], answer: 1 },
    ],
    audioDir: "audio/reading/hsk1-reading-1", chars: 12, durationSec: 95,
  },
  {
    id: "hsk1-reading-2", level: "hsk1", ord: 2,
    title: "上学", titleVi: "Đi học",
    sentences: [
      { zh: "我每天上学。", py: "Wǒ měitiān shàngxué.", vi: "Tôi đi học mỗi ngày.", audio: null, durSec: 2 },
    ],
    vocab: [],
    questions: [
      { q: "他对吗？", qVi: "Bạn ấy đúng không?", options: ["对", "错", "好", "不"], answer: 0 },
      { q: "什么颜色？", qVi: "Màu gì?", options: ["红", "蓝", "绿", "黄"], answer: 2 },
    ],
    audioDir: "audio/reading/hsk1-reading-2", chars: 8, durationSec: 30,
  },
  {
    id: "hsk2-reading-1", level: "hsk2", ord: 1,
    title: "周末", titleVi: "Cuối tuần",
    sentences: [{ zh: "周末我休息。", py: "Zhōumò wǒ xiūxi.", vi: "Cuối tuần tôi nghỉ ngơi.", audio: null, durSec: 2 }],
    vocab: [],
    questions: [{ q: "周末做什么？", qVi: "Cuối tuần làm gì?", options: ["休息", "工作"], answer: 0 }],
    audioDir: "audio/reading/hsk2-reading-1", chars: 20, durationSec: 65,
  },
];

const { docs, loadErr } = vi.hoisted(() => ({
  docs: [] as unknown[],
  loadErr: { v: null as Error | null },
}));

vi.mock("@/lib/content/readings-client", () => ({
  loadReadings: () => (loadErr.v ? Promise.reject(loadErr.v) : Promise.resolve(docs)),
  __resetReadingsCache: () => {},
}));

vi.mock("@/components/reading/use-reading-player", () => ({
  useReadingPlayer: () => ({
    playing: false, curIdx: -1, charPos: null, rate: 1, loopSentence: false,
    curTime: 0, duration: 0, hasAudio: false,
    toggle: vi.fn(), next: vi.fn(), prev: vi.fn(), seekSentence: vi.fn(),
    seekGlobal: vi.fn(), setRate: vi.fn(), setLoopSentence: vi.fn(),
  }),
}));

/* Tab Mine (Task 6) dùng useSession — mock guest để không đụng authClient. */
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ loggedIn: false, isPending: false, name: "", image: null, logout: async () => {} }),
}));

beforeEach(() => {
  docs.length = 0;
  docs.push(...fixture);
  loadErr.v = null;
  localStorage.clear();
  window.history.replaceState(null, "", "/reading");
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function renderAndWait() {
  const r = render(<ReadingClient />);
  return screen.findByText("我的家").then(() => r);
}

describe("ReadingClient — library list", () => {
  it("render tab level + section headers với đúng số bài", async () => {
    await renderAndWait();
    expect(screen.getByRole("button", { name: "Tất cả" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HSK 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HSK 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "HSK 1 (2 bài)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "HSK 2 (1 bài)" })).toBeInTheDocument();
    // meta card: 1:35 · 12 chữ
    expect(screen.getByText("1:35 · 12 chữ")).toBeInTheDocument();
  });

  it("click card → ReadingPlayer render câu đầu + Back về list", async () => {
    const user = userEvent.setup();
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: /我的家/ }));
    expect(screen.getByText("我家在北京。")).toBeInTheDocument();
    expect(screen.getByText("Câu hỏi")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← Danh sách" }));
    expect(screen.getByRole("button", { name: "HSK 1" })).toBeInTheDocument();
    expect(screen.queryByText("我家在北京。")).not.toBeInTheDocument();
  });

  it("click tab HSK 2 → chỉ grid hsk2 + replaceState ?level=hsk2; Back về list đầy đủ", async () => {
    const user = userEvent.setup();
    await renderAndWait();
    const replace = vi.spyOn(window.history, "replaceState");
    await user.click(screen.getByRole("button", { name: "HSK 2" }));
    expect(replace).toHaveBeenCalledWith(null, "", expect.stringContaining("level=hsk2"));
    expect(screen.getByRole("button", { name: /周末/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /我的家/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← Danh sách" }));
    expect(screen.getByRole("button", { name: /我的家/ })).toBeInTheDocument();
  });

  it("?level=hsk2 lúc mount (initLevel) → chỉ grid hsk2", async () => {
    render(<ReadingClient initLevel="hsk2" />);
    await screen.findByText("周末");
    expect(screen.getByRole("button", { name: /周末/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /我的家/ })).not.toBeInTheDocument();
  });

  it("loadReadings reject → nút thử lại; bấm thử lại → load lại và render", async () => {
    loadErr.v = new Error("boom");
    const user = userEvent.setup();
    render(<ReadingClient />);
    const retry = await screen.findByRole("button", { name: "Thử lại" });
    loadErr.v = null;
    await user.click(retry);
    await screen.findByText("我的家");
    expect(screen.getByText("1:35 · 12 chữ")).toBeInTheDocument();
  });
});

describe("ReadingClient — tab Mine", () => {
  it("bấm tab 'Bài của tôi' → MinePanel render, ẩn library; URL ?tab=mine", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: "Bài của tôi" }));
    expect(replace).toHaveBeenCalledWith(null, "", "/reading?tab=mine");
    expect(screen.getByRole("heading", { name: "Tạo bài đọc bằng AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo bài đọc" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "HSK 1 (2 bài)" })).not.toBeInTheDocument();
    // quota chip ẩn khi guest
    expect(screen.queryByText(/\/3 lượt/)).not.toBeInTheDocument();
  });

  it("?tab=mine lúc mount → mở ngay tab Mine", async () => {
    window.history.replaceState(null, "", "/reading?tab=mine");
    render(<ReadingClient />);
    await screen.findByRole("heading", { name: "Tạo bài đọc bằng AI" });
    expect(screen.queryByRole("button", { name: "Bài khoá" })).toBeInTheDocument();
  });

  it("tab Mine → quay lại 'Bài khoá' → library render lại", async () => {
    const user = userEvent.setup();
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: "Bài của tôi" }));
    await user.click(screen.getByRole("button", { name: "Bài khoá" }));
    expect(screen.getByRole("heading", { name: "HSK 1 (2 bài)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tạo bài đọc bằng AI" })).not.toBeInTheDocument();
  });

  it("tab Mine → bấm card draft → player render câu draft (audio null, TTS fallback)", async () => {
    const user = userEvent.setup();
    progressStore.upsertReadingDraft({
      id: "rd_x1",
      title: "我的家",
      textZh: "我的家在北京。",
      doc: {
        sentences: [{ zh: "我家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh." }],
        vocab: [],
        questions: [{ q: "q", qVi: "cq", options: ["a", "b"], answer: 0 }],
      },
      chars: 6,
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    });
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: "Bài của tôi" }));
    await user.click(screen.getByRole("button", { name: /我的家/ }));
    expect(screen.getByText("我家在北京。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← Danh sách" }));
    expect(screen.getByRole("heading", { name: "Tạo bài đọc bằng AI" })).toBeInTheDocument();
  });
});

describe("ReadingClient — progress + XP", () => {
  it("onComplete lần đầu ≥60% → saveReadingProgress + addXp(total*10); lần sau không addXp", async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(progressStore, "saveReadingProgress");
    const xpSpy = vi.spyOn(progressStore, "addXp");
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: /我的家/ }));
    await user.click(screen.getByRole("button", { name: "四口" }));
    await user.click(screen.getByRole("button", { name: "北京" }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith("hsk1-reading-1", 2, 2));
    expect(xpSpy).toHaveBeenCalledTimes(1);
    expect(xpSpy).toHaveBeenCalledWith(20);
    cleanup();

    // remount → progress đã có → Done badge, quiz lại vẫn không cộng XP
    await renderAndWait();
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: /我的家/ }));
    await user.click(screen.getByRole("button", { name: "四口" }));
    await user.click(screen.getByRole("button", { name: "北京" }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(2));
    expect(xpSpy).toHaveBeenCalledTimes(1);
  });

  it("onComplete <60% → save nhưng không addXp", async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(progressStore, "saveReadingProgress");
    const xpSpy = vi.spyOn(progressStore, "addXp");
    await renderAndWait();
    await user.click(screen.getByRole("button", { name: /上学/ }));
    await user.click(screen.getByRole("button", { name: "对" }));
    await user.click(screen.getByRole("button", { name: "红" })); // sai (đáp án 绿)
    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith("hsk1-reading-2", 1, 2));
    expect(xpSpy).not.toHaveBeenCalled();
  });
});
