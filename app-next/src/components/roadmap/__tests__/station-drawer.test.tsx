import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationDrawer } from "../station-drawer";
import { resetStationVocabCacheForTests } from "../use-station-vocab";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import { progressStore } from "@/lib/store/progress-store";
import type { RoadmapLevel } from "@/content/roadmap-stations";
import type { StationView } from "@/lib/roadmap-progress";

const tts = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => tts }));

// M-12: mock useToastSafe → assert đúng nội dung toast (không cần ToastProvider thật)
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));

const hsk2 = getRoadmapLevel("hsk-2")!;
const hsk1 = getRoadmapLevel("hsk-1")!;

const mkView = (level: RoadmapLevel, id: string, state: StationView["state"]): StationView => ({
  station: level.stations.find((s) => s.id === id)!,
  state,
  pct: state === "done" ? 100 : state === "active" ? 55 : 0,
  stars: state === "done" ? 3 : 0,
});

/** Mock fetch /api/v1/content/vocab-lesson → 5 từ giả theo book/page. */
function stubVocabFetch() {
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    const book = url.searchParams.get("book") ?? "";
    const page = url.searchParams.get("page") ?? "";
    const words = Array.from({ length: 5 }, (_, i) => ({
      hanzi: `${book}${page}字${i}`,
      pinyin: `pin ${book} ${page} ${i}`,
      meaning: `nghĩa ${i}`,
    }));
    return new Response(JSON.stringify({ lesson: { title: page, words } }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

beforeEach(() => {
  tts.speak.mockClear();
  tts.cancel.mockClear();
  tts.speaking = false;
  toast.mockClear();
  localStorage.clear();
  resetStationVocabCacheForTests();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StationDrawer", () => {
  it("đóng: panel translate ra ngoài, overlay không chặn pointer", () => {
    render(<StationDrawer view={null} level={hsk2} open={false} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { hidden: true }).className).toContain("translate-x-[102%]");
  });

  it("Escape gọi onClose khi mở (Review Focus #5 — đóng thì không)", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <StationDrawer view={mkView(hsk2, "1", "done")} level={hsk2} open onClose={onClose} />,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <StationDrawer view={mkView(hsk2, "1", "done")} level={hsk2} open={false} onClose={onClose} />,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1); // không tăng — no-op khi đóng
  });

  it("mở trạm active: status ĐANG HỌC + 3 tab với ước lượng phút", () => {
    render(<StationDrawer view={mkView(hsk2, "1", "active")} level={hsk2} open onClose={() => {}} />);
    expect(screen.getByText(/ĐANG HỌC · TRẠM 1/)).toBeTruthy();
    expect(screen.getByTestId("drawer-tab-review").textContent).toContain("Ôn nhanh");
    expect(screen.getByTestId("drawer-tab-study").textContent).toContain("Học");
    // curated 1 bài → ≈ 8 phút
    expect(screen.getByTestId("drawer-tab-study").textContent).toContain("≈ 8 phút");
    expect(screen.getByTestId("drawer-tab-quiz").textContent).toContain("Bài kiểm tra");
    expect(screen.getByTestId("drawer-tab-quiz").textContent).toContain("≈ 5 phút");
    // mặc định vào tab Học
    expect(screen.getByTestId("drawer-tab-study").getAttribute("aria-pressed")).toBe("true");
  });

  it("trạm generator: tab Học liệt kê đủ lessons với link /lesson", () => {
    const b1 = hsk2.stations.find((s) => s.id === "b1")!;
    render(<StationDrawer view={mkView(hsk2, "b1", "active")} level={hsk2} open onClose={() => {}} />);
    const links = screen.getAllByRole("link", { name: /Học bài/ });
    expect(links).toHaveLength(b1.lessons!.length);
    for (const l of b1.lessons!) {
      expect(
        links.some((a) => a.getAttribute("href") === `/lesson/${l.book}/${l.page}`),
      ).toBe(true);
    }
    // 5 bài × 8 phút
    expect(screen.getByTestId("drawer-tab-study").textContent).toContain("≈ 40 phút");
  });

  it("tab Học: bài đã markPageDone hiển thị tick, bài chưa thì không", () => {
    progressStore.markPageDone("hsk2", "lesson-1");
    render(<StationDrawer view={mkView(hsk2, "1", "active")} level={hsk2} open onClose={() => {}} />);
    expect(screen.getByTestId("lesson-done")).toBeTruthy();
    expect(screen.queryByTestId("lesson-todo")).toBeNull();
  });

  it("Ôn nhanh: 4 câu từ pool trạm trước (curated), không ghi station progress", async () => {
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "2", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-review"));
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId("warmup-prompt")).toBeTruthy();
      await user.click(screen.getAllByRole("button", { name: /^warmup-opt-/ })[0]!);
      await user.click(
        screen.getByRole("button", { name: i === 3 ? "Kết thúc ôn" : "Câu tiếp" }),
      );
    }
    expect(screen.getByTestId("warmup-done")).toBeTruthy();
    expect(progressStore.getStationProgress("hsk-2")["2"]).toBeUndefined();
  });

  it("Ôn nhanh: trạm đầu chặng → text 'Bắt đầu chặng — không cần ôn'", async () => {
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "1", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-review"));
    expect(screen.getByText("Bắt đầu chặng — không cần ôn.")).toBeTruthy();
  });

  it("prev generator: tab Ôn nhanh fetch vocab bài đầu trạm trước → 4 câu, không ghi progress", async () => {
    const fetchFn = stubVocabFetch();
    const user = userEvent.setup();
    const b1 = hsk2.stations.find((s) => s.id === "b1")!;
    const before = localStorage.getItem("bye.roadmap.stations.v1");
    render(
      <StationDrawer
        view={mkView(hsk2, "b2", "active")}
        level={hsk2}
        prevStation={b1}
        open
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByTestId("drawer-tab-review"));
    // chỉ fetch 1 bài — bài đầu của trạm trước
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(
      fetchFn.mock.calls.some(([input]) =>
        String(input).includes(`page=${b1.lessons![0]!.page}`),
      ),
    ).toBe(true);
    await waitFor(() => expect(screen.getByTestId("warmup-prompt")).toBeTruthy());
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getAllByRole("button", { name: /^warmup-opt-/ })[0]!);
      await user.click(
        screen.getByRole("button", { name: i === 3 ? "Kết thúc ôn" : "Câu tiếp" }),
      );
    }
    expect(screen.getByTestId("warmup-done")).toBeTruthy();
    // warm-up không tính điểm — progress storage byte-equal trước/sau
    expect(localStorage.getItem("bye.roadmap.stations.v1")).toBe(before);
  });

  it("prev không có lessons (milestone curated m) → giữ placeholder", async () => {
    const user = userEvent.setup();
    render(
      <StationDrawer
        view={mkView(hsk2, "6", "active")}
        level={hsk2}
        prevStation={hsk2.stations.find((s) => s.id === "m")!}
        open
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByTestId("drawer-tab-review"));
    expect(screen.getByText("Buổi sau sẽ có ôn nhanh.")).toBeTruthy();
  });

  it("gate locked: tab quiz hiển thị EntryGate thay vì quiz trạm", async () => {
    const user = userEvent.setup();
    render(
      <StationDrawer
        view={mkView(hsk1, hsk1.stations[0]!.id, "active")}
        level={hsk1}
        open
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByTestId("drawer-tab-quiz"));
    expect(screen.getByText("Kiểm tra đầu vào Pinyin")).toBeTruthy();
    expect(screen.queryByTestId("quiz-counter")).toBeNull();
  });

  it("trạm generator: tab quiz fetch vocab-lesson từng bài rồi render quiz", async () => {
    const fetchFn = stubVocabFetch();
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "b1", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-quiz"));
    await waitFor(() => expect(screen.getByTestId("quiz-counter")).toBeTruthy());
    expect(fetchFn).toHaveBeenCalledTimes(5); // b1 = 5 bài
    for (const l of hsk2.stations.find((s) => s.id === "b1")!.lessons!) {
      expect(fetchFn.mock.calls.some(([input]) => String(input).includes(`page=${l.page}`))).toBe(
        true,
      );
    }
  });

  it("milestone curated: quiz 12 câu từ pool level", async () => {
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "m", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-quiz"));
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent("1/12");
  });

  it("câu nghe: có nút aria-label 'Nghe lại'; TTS unavailable → fallback câu đọc sau timer", async () => {
    stubVocabFetch();
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "b1", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-quiz"));
    await waitFor(() => expect(screen.getByTestId("quiz-counter")).toBeTruthy());
    // click qua các câu cho tới câu nghe (listenEvery=4 → luôn tồn tại)
    for (let guard = 0; guard < 40; guard++) {
      if (screen.queryByRole("button", { name: "Nghe lại" })) break;
      await user.click(screen.getAllByRole("button", { name: /^quiz-opt-/ })[0]!);
      await user.click(screen.getByRole("button", { name: "Câu tiếp" }));
    }
    expect(screen.getByRole("button", { name: "Nghe lại" })).toBeTruthy();
    // auto-speak đã phát audioText của câu nghe
    expect(tts.speak).toHaveBeenCalled();
    // speaking luôn false (mock) → sau 1.5s fallback câu đọc "Từ nào đọc là …"
    await waitFor(
      () => expect(screen.getByTestId("quiz-prompt").textContent).toContain("Từ nào đọc là"),
      { timeout: 3000 },
    );
  });

  it("M-1 — TTS lỗi: click 'Nghe lại' revert câu nghe rồi fallback câu đọc lần nữa (timer re-arm)", async () => {
    stubVocabFetch();
    const user = userEvent.setup();
    render(<StationDrawer view={mkView(hsk2, "b1", "active")} level={hsk2} open onClose={() => {}} />);
    await user.click(screen.getByTestId("drawer-tab-quiz"));
    await waitFor(() => expect(screen.getByTestId("quiz-counter")).toBeTruthy());
    for (let guard = 0; guard < 40; guard++) {
      if (screen.queryByRole("button", { name: "Nghe lại" })) break;
      await user.click(screen.getAllByRole("button", { name: /^quiz-opt-/ })[0]!);
      await user.click(screen.getByRole("button", { name: "Câu tiếp" }));
    }
    // lần fallback đầu (speaking mock luôn false)
    await waitFor(
      () => expect(screen.getByTestId("quiz-prompt").textContent).toContain("Từ nào đọc là"),
      { timeout: 3000 },
    );
    // click "Nghe lại" → optimistic quay lại câu nghe, speak() được gọi lại
    await user.click(screen.getByRole("button", { name: "Nghe lại" }));
    expect(screen.getByTestId("quiz-prompt").textContent).toContain("Nghe từ rồi chọn phiên âm");
    expect(tts.speak).toHaveBeenCalled();
    // TTS vẫn lỗi → sau 1.5s fallback câu đọc lần nữa (timer được re-arm, không kẹt câu nghe)
    await waitFor(
      () => expect(screen.getByTestId("quiz-prompt").textContent).toContain("Từ nào đọc là"),
      { timeout: 3000 },
    );
  });
});
