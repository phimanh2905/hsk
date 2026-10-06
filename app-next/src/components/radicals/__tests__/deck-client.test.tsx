import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RadicalsClient from "../deck-client";
import { radicals } from "@/content/radicals";

/* Link chéo Luyện viết bộ này → /hanzi?rad=<bộ thủ> (TASK-11) */
describe("deck-client cross-link", () => {
  it("render ít nhất 1 anchor /hanzi?rad= với href encode đúng bộ thủ hiện tại", () => {
    render(<RadicalsClient />);
    const links = screen.queryAllByRole("link", { name: "Luyện viết bộ này" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/hanzi\?rad=/);
      const rad = decodeURIComponent(link.getAttribute("href")!.split("rad=")[1]);
      expect(radicals.some((r) => r.char === rad)).toBe(true);
    }
  });
});
