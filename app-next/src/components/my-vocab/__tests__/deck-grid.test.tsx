// app-next/src/components/my-vocab/__tests__/deck-grid.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { DeckGrid } from "../deck-grid";

afterEach(cleanup);

const decks = [
  { id: "due", name: "Từ cần ôn ngay", meta: "18 từ đến hạn", mastery: 40, icon: "inbox" as const },
  { id: "nb-1", name: "Bộ e2e", meta: "2 từ trong deck", mastery: 0, icon: "folder" as const },
];

describe("DeckGrid", () => {
  it("đủ card: icon/name/meta/mastery bar + 'Độ bền: N%' + 'Học Flashcard'", () => {
    render(<DeckGrid decks={decks} onStudy={() => {}} onMenu={() => {}} />);
    const card = getByOD("deck-due");
    expect(card.textContent).toContain("Từ cần ôn ngay");
    expect(card.textContent).toContain("18 từ đến hạn");
    expect(card.textContent).toContain("Độ bền: 40%");
    expect(card.querySelector("i")!.getAttribute("style")).toMatch(/width:\s*40%/);
    expect(card.textContent).toContain("Học Flashcard");
  });
  it("onStudy/onMenu nhận đúng id", () => {
    const onStudy = vi.fn();
    const onMenu = vi.fn();
    render(<DeckGrid decks={decks} onStudy={onStudy} onMenu={onMenu} />);
    act(() => (getByOD("deck-nb-1").querySelector("button:last-of-type") as HTMLElement).click());
    expect(onStudy).toHaveBeenCalledWith("nb-1");
    act(
      () =>
        (getByOD("deck-due").querySelector('button[aria-label="Thao tác deck"]') as HTMLElement).click(),
    );
    expect(onMenu).toHaveBeenCalledWith("due");
  });
  it("rỗng → grid trống không crash", () => {
    render(<DeckGrid decks={[]} onStudy={() => {}} onMenu={() => {}} />);
    expect(document.querySelector('[data-od-id="deck-grid"]')).toBeTruthy();
  });
});

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
