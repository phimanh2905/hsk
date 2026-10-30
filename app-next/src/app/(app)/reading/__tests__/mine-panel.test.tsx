import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MinePanel } from "../mine-panel";
import { progressStore, type SavedReadingDraft } from "@/lib/store/progress-store";

/* Task 6 plan 2026-10-30-reading-ai-mine: panel "Bài của tôi" — tạo bài AI,
   quota chip, danh sách draft (rename/delete), mở bài qua onOpen.
   Mock fetch + useSession + useLoginModal; toast mock để assert. */

const toastMock = vi.fn();
const openLoginMock = vi.fn();

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => toastMock,
  useToastSafe: () => toastMock,
}));

let sessionState = { loggedIn: false, isPending: false, name: "", image: null, logout: async () => {} };
vi.mock("@/lib/use-session", () => ({
  useSession: () => sessionState,
}));

const loginCtx = { isOpen: false, openLogin: openLoginMock, close: vi.fn() };
vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => loginCtx,
}));

/* ---- fixtures ---- */

const doc: SavedReadingDraft["doc"] = {
  sentences: [
    { zh: "我的家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh." },
    { zh: "我家有四口人。", py: "Wǒ jiā yǒu sì kǒu rén.", vi: "Nhà tôi có bốn người." },
  ],
  vocab: [{ word: "家", py: "jiā", vi: "nhà" }],
  questions: [
    { q: "q1", qVi: "cq1", options: ["a", "b", "c", "d"], answer: 0, evidence: [{ si: 0, s: 0, e: 3 }] },
    { q: "q2", qVi: "cq2", options: ["a", "b"], answer: 1 }, // không evidence → chuẩn hóa []
  ],
};

const draft = (over: Partial<SavedReadingDraft> = {}): SavedReadingDraft => ({
  id: "rd_test1",
  title: "我的家",
  textZh: "我的家在北京。我家有四口人。",
  doc,
  chars: 12,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  ...over,
});

const HAN_TEXT_100 = "我家在北京。我家有四口人。今天天气很好。我们去公园散步，看到很多美丽的花。".repeat(6);

const fetchMock = vi.fn();

/* 200 draft response */
function okRes(over: Partial<SavedReadingDraft> = {}) {
  const d = draft({ id: "rd_new1", ...over });
  return {
    ok: true,
    status: 200,
    json: async () => ({ draft: d, remaining: 2 }),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  toastMock.mockReset();
  openLoginMock.mockReset();
  sessionState = { loggedIn: false, isPending: false, name: "", image: null, logout: async () => {} };
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(d = draft()) {
  const onOpen = vi.fn();
  render(<MinePanel onOpen={onOpen} />);
  return { onOpen, draft: d };
}

describe("MinePanel — quota chip", () => {
  it("guest: không chip quota, không fetch quota", async () => {
    setup();
    expect(screen.queryByText(/\/3 lượt/)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it("logged in: fetch quota và hiện 'Còn N/3 lượt'", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ used: 1, limit: 3, nextAt: 1 }) });
    setup();
    await screen.findByText("Còn 2/3 lượt");
  });

  it("logged in: full quota → 'Còn 3/3 lượt'", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ used: 0, limit: 3, nextAt: 1 }) });
    setup();
    await screen.findByText("Còn 3/3 lượt");
  });

  it("fetch quota fail → ẩn chip, không crash", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    setup();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/\/3 lượt/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo bài đọc" })).toBeInTheDocument();
  });
});

describe("MinePanel — tạo bài", () => {
  it("validate fail (<100 ký tự) → toast, không fetch", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), "我家在北京。");
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tỉ lệ Hán đếm trên stripped (khớp server): 100 Hán + nhiều khoảng trắng vẫn hợp lệ (P2c)", async () => {
    // stripped = 100 Hán → server ratio = 1 ≥ 0.3; đếm trên raw (bug cũ) thì
    // ratio ~0.2 < 0.3 → client reject lệch server. Sau fix: guest → openLogin.
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), `${HAN_TEXT_100}${" ".repeat(400)}`);
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));
    expect(toastMock).not.toHaveBeenCalled();
    expect(openLoginMock).toHaveBeenCalledTimes(1);
  });

  it("guest bấm Tạo với text hợp lệ → openLogin, không fetch", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), HAN_TEXT_100);
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));
    expect(openLoginMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logged in + 200 → upsertReadingDraft + onOpen(draft) + toast + refresh quota", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    const user = userEvent.setup();
    const upsertSpy = vi.spyOn(progressStore, "upsertReadingDraft");
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ used: 0, limit: 3, nextAt: 1 }) })
      .mockResolvedValueOnce(okRes());

    const { onOpen } = setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), HAN_TEXT_100);
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));

    await waitFor(() => expect(upsertSpy).toHaveBeenCalled());
    const saved = upsertSpy.mock.calls[0][0] as SavedReadingDraft;
    // textZh lấy từ server response (không phải raw textarea)
    expect(saved).toMatchObject({ title: "我的家", textZh: "我的家在北京。我家有四口人。", chars: 12 });
    expect(saved.doc.questions[1].evidence).toEqual([]);
    expect(saved.createdAt).toBeTypeOf("number");
    // onOpen nhận đúng draft đã lưu
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(saved));
    expect(toastMock).toHaveBeenCalledWith("Đã lưu vào Bài của tôi");
    // fetch POST đúng endpoint
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/v1/reading/generate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: HAN_TEXT_100 });
    // quota refresh (lần 3)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("429 → toast có giờ reset (vi-VN) từ nextAt", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    const user = userEvent.setup();
    const nextAt = Date.UTC(2026, 9, 31, 17, 0, 0); // 1/11 00:00 +07
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ used: 0, limit: 3, nextAt: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "Bạn đã hết lượt tạo bài hôm nay", nextAt }) });

    setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), HAN_TEXT_100);
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("hết lượt"));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining(new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(nextAt)));
    expect(progressStore.getReadingDrafts()).toHaveLength(0);
  });

  it("400 → toast error message", async () => {
    sessionState = { ...sessionState, loggedIn: true };
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ used: 0, limit: 3, nextAt: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "Văn bản chưa đủ tiếng Trung" }) });

    setup();
    await user.type(screen.getByPlaceholderText(/dán văn bản/i), HAN_TEXT_100);
    await user.click(screen.getByRole("button", { name: "Tạo bài đọc" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Văn bản chưa đủ tiếng Trung"));
  });
});

describe("MinePanel — danh sách drafts", () => {
  it("render title + meta 'n chữ · ngày' từ store; empty → hint", async () => {
    const d = draft();
    progressStore.upsertReadingDraft(d);
    setup();
    expect(screen.getByText("我的家")).toBeInTheDocument();
    expect(screen.getByText(/12 chữ · /)).toBeInTheDocument();
    // empty hint ẩn
    expect(screen.queryByText(/Chưa có bài/i)).not.toBeInTheDocument();

    cleanup();
    progressStore.removeReadingDraft(d.id);
    render(<MinePanel onOpen={vi.fn()} />);
    expect(screen.getByText(/Chưa có bài/i)).toBeInTheDocument();
  });

  it("bấm card → onOpen(draft)", async () => {
    progressStore.upsertReadingDraft(draft());
    const user = userEvent.setup();
    const { onOpen } = setup();
    await user.click(screen.getByRole("button", { name: /我的家/ }));
    expect(onOpen).toHaveBeenCalledWith(draft());
  });

  it("rename: Enter → upsertReadingDraft title mới + updatedAt mới", async () => {
    const d = draft();
    progressStore.upsertReadingDraft(d);
    const user = userEvent.setup();
    const upsertSpy = vi.spyOn(progressStore, "upsertReadingDraft");
    setup();
    await user.click(screen.getByRole("button", { name: "Đổi tên" }));
    const input = screen.getByRole("textbox", { name: "Tên bài mới" }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "新的标题{Enter}");
    await waitFor(() => expect(upsertSpy).toHaveBeenCalledTimes(1));
    const saved = upsertSpy.mock.calls[0][0] as SavedReadingDraft;
    expect(saved.title).toBe("新的标题");
    expect(saved.updatedAt).toBeGreaterThan(d.updatedAt);
    expect(saved.id).toBe(d.id);
  });

  it("rename: Esc → hủy, không upsert", async () => {
    progressStore.upsertReadingDraft(draft());
    const user = userEvent.setup();
    const upsertSpy = vi.spyOn(progressStore, "upsertReadingDraft");
    setup();
    await user.click(screen.getByRole("button", { name: "Đổi tên" }));
    await user.type(screen.getByRole("textbox", { name: "Tên bài mới" }), "abc{Escape}");
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: "Tên bài mới" })).not.toBeInTheDocument();
  });

  it("delete 2 bước: lần 1 → nút đỏ 'Xóa?'; lần 2 → removeReadingDraft", async () => {
    const d = draft();
    progressStore.upsertReadingDraft(d);
    const user = userEvent.setup();
    const removeSpy = vi.spyOn(progressStore, "removeReadingDraft");
    setup();
    await user.click(screen.getByRole("button", { name: "Xóa bài" }));
    expect(removeSpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Xóa?" }));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith(d.id));
  });

  it("delete timeout 3s → về trạng thái thường, không xóa", () => {
    vi.useFakeTimers();
    try {
      progressStore.upsertReadingDraft(draft());
      const removeSpy = vi.spyOn(progressStore, "removeReadingDraft");
      render(<MinePanel onOpen={vi.fn()} />);
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Xóa bài" }));
      });
      screen.getByRole("button", { name: "Xóa?" });
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(removeSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Xóa?" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Xóa bài" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
