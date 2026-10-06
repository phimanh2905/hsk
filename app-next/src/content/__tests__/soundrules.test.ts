import { describe, expect, it } from "vitest";
import { soundRulesData } from "@/content/soundrules";

/* Hex cứng trong data bypass theme (dark mode không đổi được) — phải tham chiếu
   token của design system. toneColors hiện chưa được render trực tiếp nhưng vẫn
   thuộc shape 1:1 với clone, nên giữ dạng var() để dùng lúc nào cũng đúng theme. */
describe("toneColors (soundrules)", () => {
  it("mọi giá trị là tham chiếu var(--hz-tone-*), không hex cứng", () => {
    for (const [key, value] of Object.entries(soundRulesData.toneColors)) {
      expect(value, `toneColors[${key}]`).toMatch(/^var\(--hz-tone-\d\)$/);
    }
  });
});
