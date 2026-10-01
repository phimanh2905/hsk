import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("@media print trong globals.css (port theme.css:85-89)", () => {
  const css = readFileSync(join(__dirname, "../../../src/app/globals.css"), "utf8");
  it("giữ selector semantic data-shell / no-print / print-area", () => {
    const block = css.slice(css.indexOf("@media print"));
    expect(block).toContain("[data-shell]");
    expect(block).toContain(".no-print");
    expect(block).toContain(".print-area");
    expect(block).toContain("display: none !important");
  });
});
