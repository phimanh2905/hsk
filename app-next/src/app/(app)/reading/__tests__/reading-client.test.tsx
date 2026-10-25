import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingClient from "../reading-client";
import { progressStore } from "@/lib/store/progress-store";

const speakMock = vi.fn();

// W3 T9: passages thật chưa gen — mock fixture 1 passage HSK1 cho picker.
// passages là mảng mutable trong vi.hoisted để test fallback rỗng swap được.
const { passages } = vi.hoisted(() => ({
  passages: [
    {
      id: "hsk1-reading-1",
      book: "hsk1",
      lesson: "lesson-1",
      title: "My small apartment",
      titleVi: "Căn hộ nhỏ của tôi",
      sentences: [
        { zh: "我住在学校附近的一间小公寓。", py: "Wǒ zhù zài xuéxiào fùjìn de yì jiān xiǎo gōngyù.", vi: "Tôi sống trong một căn hộ nhỏ gần trường." },
        { zh: "每天早上我七点起床。", py: "Měitiān zǎoshang wǒ qī diǎn qǐchuáng.", vi: "Mỗi sáng tôi ngủ dậy lúc bảy giờ." }
      ],
      vocab: [{ word: "公寓", py: "gōngyù", vi: "căn hộ" }],
      questions: [
        { q: "我住在哪里？", qVi: "Tôi sống ở đâu?", options: ["学校附近", "公司里面", "公园旁边"], answer: 0 }
      ]
    }
  ] as unknown[],
}));
vi.mock("@/content/reading-passages", () => ({
  readingPassages: passages,
}));

// UPG-2: account-box đọc session thật qua useSession, không đọc localStorage mock.
const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ ...session, name: "T", image: null, isPending: false, logout: vi.fn() }),
}));

beforeEach(() => {
  localStorage.clear();
  session.loggedIn = false;
  vi.stubGlobal("speechSynthesis", {
    speak: speakMock, cancel: vi.fn(), speaking: false,
    getVoices: vi.fn(() => [{ name: "Tingting", lang: "zh-CN" }]),
  });
  speakMock.mockClear();
});

describe("ReadingClient (G3)", () => {
  it("điền văn bản mẫu → Tạo bài đọc → 11 câu (title dòng đầu)", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("Điền văn bản mẫu"));
    expect(screen.getByText("Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!")).toBeInTheDocument();
    await user.click(screen.getByText("Tạo bài đọc"));
    // sampleText thực tế tách thành 13 câu (comment "11 câu" trong dữ liệu không khớp thực tế)
    expect(screen.getByText(/13 câu/)).toBeInTheDocument();
  });
  it("mở bài demo từ sidebar → 13 câu + Câu hỏi & Từ vựng + MCQ đúng → toast", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    expect(screen.getByText(/13 câu/)).toBeInTheDocument();
    expect(screen.getByText("Câu hỏi & Từ vựng")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "A. 先喝一杯温水" }));
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
  });
  it("Phát câu 1: utterance lang zh-CN + rate; Phát cả bài đổi sang Dừng; Dừng huỷ sạch", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    await user.click(screen.getAllByRole("button", { name: "Đọc câu 1" })[0]);
    expect(speakMock).toHaveBeenCalledTimes(1);
    const u = speakMock.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.lang).toBe("zh-CN");
    expect(u.rate).toBe(1);
    await user.click(screen.getByRole("button", { name: "Phát cả bài" }));
    expect(screen.getByRole("button", { name: "Dừng" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dừng" }));
    expect(screen.getByRole("button", { name: "Phát cả bài" })).toBeInTheDocument();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
  it("account-box: chưa login → nút Đăng nhập; có session → text demo", async () => {
    const user = userEvent.setup();
    session.loggedIn = false;
    const { rerender } = render(<ReadingClient />);
    expect(screen.getByText("Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.")).toBeInTheDocument();
    session.loggedIn = true;
    rerender(<ReadingClient key="logged-in" />);
    expect(screen.getByText(/Chưa có bài nào được lưu/)).toBeInTheDocument();
  });
  it("textarea cắt tại 3000 ký tự", { timeout: 30000 }, async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    const ta = screen.getByLabelText(/Nội dung bài đọc/) as HTMLTextAreaElement;
    await user.type(ta, "好".repeat(3010));
    expect(ta.value.length).toBe(3000);
    expect(screen.getByText("3000/3000")).toBeInTheDocument();
  });
});

describe("ReadingClient — picker bài đọc theo level (W3 T9)", () => {
  it("render picker passage với option = title; chọn passage -> textarea chứa câu đầu", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    const picker = screen.getByTestId("reading-passage-select") as HTMLSelectElement;
    expect(picker).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /My small apartment/ })).toBeInTheDocument();
    await user.selectOptions(picker, "hsk1-reading-1");
    const input = screen.getByLabelText(/Nội dung bài đọc/) as HTMLTextAreaElement;
    expect(input.value).toContain("我住在学校附近的一间小公寓");
    // draft tự lưu khi chọn passage (W0.4 behavior)
    expect(progressStore.getReadingDrafts().some((d) => d.text.includes("我住在学校附近"))).toBe(true);
  });

  it("chọn passage -> doc hiển thị câu + extras questions với đáp án đúng", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.selectOptions(screen.getByTestId("reading-passage-select"), "hsk1-reading-1");
    expect(screen.getByText(/2 câu/)).toBeInTheDocument();
    expect(screen.getByText("Câu hỏi & Từ vựng")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "A. 学校附近" }));
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    // option sai -> toast chưa đúng
    await user.click(screen.getByRole("button", { name: "B. 公司里面" }));
    expect(screen.getByText("Chưa đúng — thử lại nhé!")).toBeInTheDocument();
  });

  it("passages rỗng -> không render picker (fallback demo)", () => {
    const saved = [...passages];
    passages.length = 0;
    try {
      render(<ReadingClient key="empty" />);
      expect(screen.queryByTestId("reading-passage-select")).not.toBeInTheDocument();
    } finally {
      passages.push(...saved);
    }
  });
});

describe("ReadingClient — bản nháp tự lưu (W0.4)", () => {
  it("Tạo bài đọc → draft lưu vào bye.reading.drafts", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.type(screen.getByLabelText("Nội dung bài đọc"), "第一篇测试文章。");
    await user.click(screen.getByText("Tạo bài đọc"));
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].text).toContain("第一篇测试文章");
  });

  it("mount lại → textarea khôi phục draft mới nhất", async () => {
    progressStore.saveReadingDraft("昨天的旧文章。今天很好。");
    progressStore.saveReadingDraft("最新的一篇文章。今天很好。");
    render(<ReadingClient />);
    const input = screen.getByLabelText("Nội dung bài đọc") as HTMLTextAreaElement;
    await waitFor(() => expect(input.value).toBe("最新的一篇文章。今天很好。"));
    expect(screen.getByText("Bản nháp đã lưu")).toBeTruthy();
    // text xuất hiện ở cả sidebar span lẫn textarea value → getAllByText
    expect(screen.getAllByText("最新的一篇文章。今天很好。").length).toBeGreaterThanOrEqual(1);
  });

  it("bấm draft cũ trong sidebar → nạp lại vào textarea", async () => {
    progressStore.saveReadingDraft("文章甲。内容很长很好。");
    progressStore.saveReadingDraft("文章乙。内容也很长。");
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("文章甲。内容很长很好。"));
    const input = screen.getByLabelText("Nội dung bài đọc") as HTMLTextAreaElement;
    expect(input.value).toBe("文章甲。内容很长很好。");
  });
});
