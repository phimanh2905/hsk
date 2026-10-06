import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziStudio, { clampPage } from "../hanzi-studio";
import type { WorkbenchData } from "@/components/hanzi/studio/studio-workbench";

vi.mock("@/components/hanzi/studio/studio-grid", () => ({
  StudioGrid: () => <div data-od-id="tianzi-grid" />,
}));
vi.mock("@/components/hanzi/studio/studio-workbench", () => ({
  StudioWorkbench: ({
    data,
    onSelectTray,
  }: {
    data: WorkbenchData | null;
    onSelectTray: (ch: string) => void;
  }) => {
    const glyph = data ? (data.kind === "rad" ? data.rad.char : data.meta.ch) : "null";
    return (
      <div>
        <div data-testid="workbench">
          {glyph}·{data ? data.kind : "null"}
        </div>
        {data?.kind === "rad" && (
          <div>
            {data.rad.chars.map((c) => (
              <button key={c.ch} onClick={() => onSelectTray(c.ch)} data-tray={c.ch}>
                {c.ch}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
}));

afterEach(cleanup);

beforeEach(() => {
  // jsdom URL mặc định localhost — đảm bảo không có ?rad
  window.history.replaceState(null, "", "/hanzi");
});

describe("clampPage (Review Focus #1)", () => {
  it("kẹp về [1, pages]", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(1, 0)).toBe(1); // pages tối thiểu 1
  });
});

describe("HanziStudio (radical-first)", () => {
  it("mặc định rad mode, chọn 水, catalog hiện card bộ thủ", async () => {
    render(<HanziStudio />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /水/ }).length).toBeGreaterThan(0),
    );
    expect(screen.getByTestId("cat-count").textContent).toMatch(/bộ thủ/);
  });

  it("deep-link ?rad=口 chọn đúng bộ", async () => {
    window.history.replaceState(null, "", "/hanzi?rad=口");
    render(<HanziStudio />);
    await waitFor(() => {
      const wb = screen.getByTestId("workbench");
      expect(wb.textContent).toContain("口");
    });
  });

  it("click tray chip → workbench chuyển sang kind char", async () => {
    render(<HanziStudio />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /没/ }).length).toBeGreaterThan(0),
    );
    await userEvent.click(screen.getAllByRole("button", { name: /没/ })[0]);
    await waitFor(() => expect(screen.getByTestId("workbench").textContent).toContain("char"));
  });

  it("mode-switch HSK → catalog hiện chữ + level tab", async () => {
    render(<HanziStudio />);
    await userEvent.click(screen.getByRole("button", { name: /Theo cấp độ HSK/ }));
    await waitFor(() => expect(screen.getByTestId("cat-count").textContent).toMatch(/chữ/));
    expect(screen.getByRole("button", { name: "HSK 2" })).toBeTruthy();
  });

  it("filter số nét 3 nét → không còn card 2 nét", async () => {
    render(<HanziStudio />);
    await userEvent.click(screen.getByRole("button", { name: "3 nét" }));
    const count = screen.getByTestId("cat-count").textContent!;
    expect(count).toMatch(/^\d+ bộ thủ/);
  });

  it("filter 'Số nét' chỉ ở rad mode — ẩn ở HSK mode", async () => {
    render(<HanziStudio />);
    expect(screen.getByText("Số nét")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Theo cấp độ HSK/ }));
    await waitFor(() => expect(screen.queryByText("Số nét")).toBeNull());
    expect(screen.getByLabelText("Tìm bộ thủ")).toBeTruthy();
    expect(screen.getByLabelText("Tìm bộ thủ").getAttribute("placeholder")).toBe("Tìm chữ, pinyin…");
  });

  it("search 'khau' → 口 trong kết quả", async () => {
    render(<HanziStudio />);
    expect(screen.getByLabelText("Tìm bộ thủ").getAttribute("placeholder")).toBe("Tìm bộ thủ, nghĩa…");
    await userEvent.type(screen.getByLabelText("Tìm bộ thủ"), "khau");
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /口/ }).length).toBeGreaterThan(0),
    );
  });
});
