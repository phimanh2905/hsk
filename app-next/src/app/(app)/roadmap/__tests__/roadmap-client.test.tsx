import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/shell/toast-provider";
import { roadmapLevels } from "@/content/roadmap-stations";
import RoadmapClient from "../roadmap-client";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: new URLSearchParams("level=hsk-2"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
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

  it("upcoming level (hsk-3): banner Sắp ra mắt, không render path", () => {
    renderClient("hsk-3");
    expect(screen.getByText(/sắp ra mắt/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Trạm 1/ })).toBeNull();
  });

  it("click node mở drawer; click node khóa hiện toast", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "Trạm 2: Số đếm & Mua sắm — đang khóa" }));
    expect(screen.getByText(/Trạm đang khóa — xong Trạm 1 để mở/)).toBeTruthy();
    expect(screen.getByText(/Bài 2: Số đếm & Mua sắm/)).toBeTruthy();
  });

  it("chuyển level gọi router.replace với ?level mới", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "HSK 3" }));
    expect(nav.replace).toHaveBeenCalledWith("/roadmap?level=hsk-3", { scroll: false });
  });
});
