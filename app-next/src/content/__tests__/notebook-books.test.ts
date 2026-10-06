// src/content/__tests__/notebook-books.test.ts
import { describe, it, expect } from "vitest";
import { notebookBooks } from "@/content/notebook-books";

describe("notebookBooks (spec §3.3)", () => {
  it("đủ 3 sổ tĩnh đúng id và thứ tự", () => {
    expect(notebookBooks.map((b) => b.id)).toEqual(["confusables", "idioms", "speaking"]);
  });
  it("mỗi book đủ trường hiển thị, không rỗng", () => {
    for (const b of notebookBooks) {
      expect(b.icon.length).toBeGreaterThan(0);
      expect(b.title.length).toBeGreaterThan(0);
      expect(b.sub.length).toBeGreaterThan(0);
      expect(b.big.length).toBeGreaterThan(0);
      expect(b.badge.length).toBeGreaterThan(0);
      expect(["ok", "soft"]).toContain(b.badgeTone);
      expect(b.cta.length).toBeGreaterThan(0);
    }
  });
});
