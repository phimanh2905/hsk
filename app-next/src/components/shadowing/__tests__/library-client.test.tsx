import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LibraryClient from "../library-client";
import { shadowingPlaylists, shadowingVideos } from "@/content/shadowing";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

//next/navigation useSearchParams — mock theo ?cat (vi.requireMock không có ở vitest 8, dùng biến mutable)
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

function renderAt(cat?: string) {
  searchParams = new URLSearchParams(cat ? { cat } : "");
  return render(<LibraryClient playlists={shadowingPlaylists} videos={shadowingVideos} />);
}

describe("LibraryClient (G4)", () => {
  it("mặc định render 5 section playlist, mỗi section 4 card + XEM TẤT CẢ", () => {
    renderAt();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getAllByText("XEM TẤT CẢ →")).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: /Shadowing/ }).length).toBeGreaterThanOrEqual(20);
  });
  it("?cat=so-cap chỉ còn 1 nhóm + breadcrumb quay lại", () => {
    renderAt("so-cap");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "← Tất cả nhóm" })).toHaveAttribute("href", "/shadowing");
  });
  it("XEM TẤT CẢ bấm ra toast 'Sẽ có sớm', không điều hướng", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getAllByText("XEM TẤT CẢ →")[0]);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Sẽ có sớm");
  });
});
