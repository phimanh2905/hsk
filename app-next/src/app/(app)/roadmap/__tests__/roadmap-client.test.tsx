import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/shell/toast-provider";
import { roadmapLevels, getRoadmapLevel } from "@/content/roadmap-stations";
import { PINYIN_SESSIONS } from "@/lib/roadmap-progress";
import RoadmapClient from "../roadmap-client";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  search: new URLSearchParams("level=hsk-2"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => nav.search,
}));

function renderClient(level: string) {
  nav.search = new URLSearchParams(`level=${level}`);
  return render(
    <ToastProvider>
      <RoadmapClient levels={roadmapLevels} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  nav.push.mockClear();
});

describe("RoadmapClient", () => {
  it("HSK 2: topbar + banner Chặng 1 + path 7 trạm + drawer đóng", () => {
    renderClient("hsk-2");
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trạm 1: Chào hỏi & Làm quen — đang học" })).toBeTruthy();
    expect(screen.getByRole("dialog", { hidden: true }).className).toContain("translate-x-[102%]");
  });

  it("Review Focus #3 — ?level=garbage fallback hsk-2 không crash", () => {
    renderClient("hsk-99");
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
  });

  it("upcoming level (hsk-6): banner Sắp ra mắt, không render path", () => {
    renderClient("hsk-6");
    expect(screen.getByText(/sắp ra mắt/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Trạm 1/ })).toBeNull();
  });

  it("I-3 — upcoming level: header pct 0 (không 100%) dù summary.pct rỗng=100", () => {
    renderClient("hsk-6");
    // topbar = div aria-label "Tiến độ toàn lộ trình N%"; banner dùng aria-label riêng "Tiến độ <title>"
    expect(screen.getByLabelText("Tiến độ toàn lộ trình 0%")).toBeTruthy();
    expect(screen.queryByLabelText("Tiến độ 100%")).toBeNull();
  });

  it("click node mở drawer; click node khóa hiện toast", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "Trạm 2: Số đếm & Mua sắm — đang khóa" }));
    expect(screen.getByText(/Trạm đang khóa — xong Trạm 1 để mở/)).toBeTruthy();
    expect(screen.getByText(/Bài 2: Số đếm & Mua sắm/)).toBeTruthy();
  });

  it("onContinue điều hướng thật: Trạm 1 active → /lesson/hsk2/lesson-1", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "Vào bài học" }));
    expect(nav.push).toHaveBeenCalledWith("/lesson/hsk2/lesson-1");
  });

  it("banner hsk-2: link 'Tiếp tục học →' trỏ bài active (Trạm 1)", () => {
    renderClient("hsk-2");
    expect(screen.getByRole("link", { name: "Tiếp tục học →" })).toHaveAttribute("href", "/lesson/hsk2/lesson-1");
  });

  it("topbar pct là % toàn lộ trình có trọng số: pinyin 4/8 (50%) + các level khác 0%", () => {
    localStorage.setItem("bye.roadmap.pinyin", JSON.stringify([1, 2, 3, 4]));
    renderClient("pinyin");
    // Task 5: expectation ĐỘNG — weight pinyin = PINYIN_SESSIONS, level khác = số trạm lesson
    // (đúng công thức production trong overallRoadmapPct); đổi content không vỡ test.
    const weightOf = (id: string) =>
      id === "pinyin" ? PINYIN_SESSIONS : getRoadmapLevel(id)!.stations.filter((s) => s.kind === "lesson").length;
    const totalWeight = roadmapLevels
      .filter((l) => l.status === "available")
      .reduce((sum, l) => sum + weightOf(l.id), 0);
    const expected = Math.round((50 * PINYIN_SESSIONS) / totalWeight);
    expect(screen.getByLabelText(`Tiến độ toàn lộ trình ${expected}%`)).toBeTruthy();
  });

  it("I-4 — banner-only pinyin: banner pct + copy derive từ store Pinyin thật, không hardcode 100", () => {
    localStorage.setItem("bye.roadmap.pinyin", JSON.stringify([1, 2, 3, 4]));
    renderClient("pinyin");
    expect(screen.getByRole("heading", { name: "Nền tảng: Pinyin & nét cơ bản" })).toBeTruthy();
    // banner = 50% pinyin thật; topbar riêng đã assert overall có trọng số ở test trên
    expect(screen.getByRole("progressbar", { name: "Tiến độ Nền tảng: Pinyin & nét cơ bản" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("Đã hoàn thành 4/8 buổi · ôn tập giữ streak")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Xem lộ trình Pinyin/ })).toHaveAttribute("href", "/roadmap/pinyin");
    expect(screen.queryByRole("button", { name: /— đang học/ })).toBeNull();
  });

  it("I-4 — pinyin chưa xong buổi nào: pct 0 + copy 'Chưa bắt đầu' (không 'Đã hoàn thành')", () => {
    renderClient("pinyin");
    expect(screen.getByRole("progressbar", { name: "Tiến độ Nền tảng: Pinyin & nét cơ bản" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Chưa bắt đầu · mở lộ trình Pinyin")).toBeTruthy();
    expect(screen.queryByText(/Đã hoàn thành/)).toBeNull();
  });

  it("chuyển level gọi router.replace với ?level mới", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "HSK 3" }));
    expect(nav.replace).toHaveBeenCalledWith("/roadmap?level=hsk-3", { scroll: false });
  });

  it("Task 9 — banner pinyin khi overall=0: dòng '🚩 Bắt đầu ở đây' (journey-start)", () => {
    renderClient("pinyin");
    expect(screen.getByTestId("journey-start")).toBeTruthy();
  });

  it("Task 9 — banner pinyin khi overall>0: KHÔNG hiện journey-start", () => {
    localStorage.setItem("bye.roadmap.pinyin", JSON.stringify([1, 2, 3, 4]));
    renderClient("pinyin");
    expect(screen.queryByTestId("journey-start")).toBeNull();
  });

  it("Task 9 (fix R1) — overall>0 cô lập qua station record (không seed pinyin): vẫn ẩn journey-start", () => {
    // Station hsk-2 "1" pct>=80 → overallRoadmapPct > 0 dù pinyinDone = 0:
    // điều kiện ẩn là overall === 0 (false DO overall), không phải pinyinDone > 0.
    localStorage.setItem(
      "bye.roadmap.stations.v1",
      JSON.stringify({ "hsk-2": { "1": { pct: 100, stars: 3 } } }),
    );
    renderClient("pinyin");
    expect(screen.getByText("Chưa bắt đầu · mở lộ trình Pinyin")).toBeTruthy();
    expect(screen.queryByTestId("journey-start")).toBeNull();
  });

  it("Task 9 — banner hsk-1 gate locked: 'Cổng đầu vào: Kiểm tra nghe pinyin (trong trạm 1)'", () => {
    renderClient("hsk-1");
    expect(screen.getByText("Cổng đầu vào: Kiểm tra nghe pinyin (trong trạm 1)")).toBeTruthy();
  });

  it("Task 9 — banner hsk-1 gate open (gate 90%): 'Đã qua ✅'", () => {
    localStorage.setItem("bye.roadmap.gates.v1", JSON.stringify({ "hsk-1": { pct: 90, at: 1 } }));
    renderClient("hsk-1");
    expect(screen.getByText("Cổng đầu vào: Đã qua ✅")).toBeTruthy();
  });

  it("Task 9 — banner hsk-1 gate exempt (pinyin 8/8): 'Đã miễn (Pinyin xong) ✅'", () => {
    localStorage.setItem(
      "bye.roadmap.pinyin",
      JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]),
    );
    renderClient("hsk-1");
    expect(screen.getByText("Cổng đầu vào: Đã miễn (Pinyin xong) ✅")).toBeTruthy();
  });

  it("Task 9 — upcoming hsk-7-9: sub 'Đích đến: HSK 7–9 — …' + endLabel 'Theo dõi cập nhật'", () => {
    renderClient("hsk-7-9");
    expect(
      screen.getByText(
        "Đích đến: HSK 7–9 — đọc hiểu văn bản học thuật, báo chí chuyên sâu và giao tiếp thành thạo như người bản ngữ.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Theo dõi cập nhật")).toBeTruthy();
  });

  it("F6b — mọi trạm done: banner 'Hoàn thành toàn bộ trạm', không còn 'Tiếp tục học'", () => {
    const all = Object.fromEntries(
      getRoadmapLevel("hsk-2")!.stations.map((s) => [s.id, { pct: 100, stars: 3 }]),
    );
    localStorage.setItem("bye.roadmap.stations.v1", JSON.stringify({ "hsk-2": all }));
    renderClient("hsk-2");
    expect(screen.getByText("🎉 Hoàn thành toàn bộ trạm")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Tiếp tục học →" })).toBeNull();
  });
});
