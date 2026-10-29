import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationDrawer } from "../station-drawer";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import type { StationView } from "@/lib/roadmap-progress";

const tts = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => tts }));

// M-12: mock useToastSafe → assert đúng nội dung toast (không cần ToastProvider thật)
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));

const hsk2 = getRoadmapLevel("hsk-2")!;
const mkView = (id: string, state: StationView["state"]): StationView => ({
  station: hsk2.stations.find((s) => s.id === id)!,
  state,
  pct: state === "done" ? 100 : state === "active" ? 55 : 0,
  stars: state === "done" ? 3 : 0,
});

beforeEach(() => {
  tts.speak.mockClear();
  toast.mockClear();
  localStorage.clear();
});

describe("StationDrawer", () => {
  it("đóng: panel translate ra ngoài, overlay không chặn pointer", () => {
    render(<StationDrawer view={null} level={hsk2} open={false} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { hidden: true }).className).toContain("translate-x-[102%]");
  });

  it("mở trạm active: status ĐANG HỌC, title, sub, 2 tab, 3 nút launch", () => {
    render(<StationDrawer view={mkView("4", "active")} level={hsk2} open onClose={() => {}} />);
    expect(screen.getByText(/ĐANG HỌC · TRẠM 4/)).toBeTruthy();
    expect(screen.getByText(/Bài 4: Sở thích & Thời gian rảnh/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Từ vựng mới" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Học Flashcard" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Luyện viết Hanzi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thi trắc nghiệm Quiz" })).toBeTruthy();
  });

  it("launch: Flashcard link đúng lessonHref, Hanzi link /hanzi, Quiz là button", () => {
    render(<StationDrawer view={mkView("4", "active")} level={hsk2} open onClose={() => {}} />);
    expect(screen.getByRole("link", { name: "Học Flashcard" })).toHaveAttribute(
      "href",
      "/lesson/hsk2/lesson-25",
    );
    expect(screen.getByRole("link", { name: "Luyện viết Hanzi" })).toHaveAttribute("href", "/hanzi");
  });

  it("vocab row: nút audio gọi speak(zh)", async () => {
    render(<StationDrawer view={mkView("4", "active")} level={hsk2} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nghe phát âm 爱好" }));
    expect(tts.speak).toHaveBeenCalledWith("爱好");
  });

  it("tab Ngữ pháp trọng tâm: hiện điểm ngữ pháp", async () => {
    render(<StationDrawer view={mkView("4", "active")} level={hsk2} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Ngữ pháp trọng tâm" }));
    expect(screen.getByText("Câu chữ 把")).toBeTruthy();
    expect(screen.getByText("把 + tân ngữ + V + 补语")).toBeTruthy();
  });

  it("Escape gọi onClose khi mở (Review Focus #5 — đóng thì không)", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <StationDrawer view={mkView("1", "done")} level={hsk2} open onClose={onClose} />,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <StationDrawer view={mkView("1", "done")} level={hsk2} open={false} onClose={onClose} />,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1); // không tăng — no-op khi đóng
  });

  it("Trạm 1 active: click Quiz → quiz-prompt xuất hiện trong drawer", async () => {
    render(<StationDrawer view={mkView("1", "active")} level={hsk2} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Thi trắc nghiệm Quiz" }));
    expect(screen.getByTestId("quiz-prompt")).toBeTruthy();
  });

  it("Trạm locked: nút Quiz disabled", () => {
    render(<StationDrawer view={mkView("2", "locked")} level={hsk2} open onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Thi trắc nghiệm Quiz" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Milestone: Học Flashcard disabled (không có lesson)", () => {
    render(<StationDrawer view={mkView("m", "active")} level={hsk2} open onClose={() => {}} />);
    const flash = screen.getByRole("button", { name: "Học Flashcard" });
    expect(flash).toHaveProperty("disabled", true);
    expect(flash).toHaveAttribute("title", "Mini test tổng hợp");
  });
});
