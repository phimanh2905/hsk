import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShadowingDrawer } from "../shadowing-drawer";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({ progressMap: {}, metrics: { practiced: 0, seconds: 0, avgScore: null }, recordPractice: vi.fn(), ready: true }),
}));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

import { videosFixture, subsFixture } from "@/lib/shadowing/__tests__/fixtures";

const v = videosFixture[0];
const lines = subsFixture[v.id];

describe("ShadowingDrawer (port script-drawer)", () => {
  it("render title, py, vi, các dòng + nút nghe từng câu, Esc đóng", () => {
    const onClose = vi.fn();
    render(<ShadowingDrawer video={v} lines={lines} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Xem trước hội thoại" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Nghe câu thoại" })).toHaveLength(2);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("CTA 'Mở bài luyện đầy đủ' link sang /shadowing/{id}", () => {
    render(<ShadowingDrawer video={v} lines={lines} onClose={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Mở bài luyện đầy đủ" })).toHaveAttribute("href", "/shadowing/" + v.id);
  });
});
