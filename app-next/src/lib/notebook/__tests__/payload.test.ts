import { describe, it, expect } from "vitest";
import { parsePayload, safeParsePayload } from "@/lib/notebook/payload";

describe("payloadByKind (spec §3.2)", () => {
  it("wrong: đủ 3 khối, wrong có thể null", () => {
    const p = parsePayload("wrong", { q: "昨…?", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "…" });
    expect(p).toMatchObject({ q: "昨…?" });
    expect(parsePayload("wrong", { q: "q", wrong: null, right: { zh: "x" }, cause: "c" })).toMatchObject({ wrong: null });
  });
  it("chars: 2..4 cặp, mỗi cặp zh+py bắt buộc", () => {
    const ok = parsePayload("chars", { chars: [{ zh: "已", py: "yǐ" }, { zh: "己", py: "jǐ" }], tip: "Mẹo…" });
    expect(ok).toHaveProperty("chars");
    expect(() => parsePayload("chars", { chars: [{ zh: "已", py: "yǐ" }], tip: "t" })).toThrow(); // 1 cặp
    expect(() => parsePayload("chars", { chars: [{ zh: "已" }, { zh: "己", py: "jǐ" }], tip: "t" })).toThrow(); // thiếu py
  });
  it("personal: note ≥2 ký tự", () => {
    expect(() => parsePayload("personal", { note: "a" })).toThrow();
    expect(parsePayload("personal", { note: "abc" })).toMatchObject({ note: "abc" });
  });
  it("safeParsePayload hỏng → null, không throw", () => {
    expect(safeParsePayload("wrong", { oops: true })).toBeNull();
    expect(safeParsePayload("personal", JSON.parse('"{broken"'))).toBeNull();
  });
});
