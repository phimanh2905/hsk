import { describe, it, expect } from "vitest";
import { certificateData } from "../certificates";

describe("certificateData", () => {
  it("có 7 card HSK 3.0 đúng logo và tên", () => {
    expect(certificateData.hsk).toHaveLength(7);
    expect(certificateData.hsk[0]).toMatchObject({
      logo: "H1",
      name: "HSK 1",
      zh: "汉语水平考试 一级",
    });
    expect(certificateData.hsk[6].logo).toBe("7-9");
  });
  it("có 3 card HSKK", () => {
    expect(certificateData.hskk).toHaveLength(3);
    expect(certificateData.hskk[0]).toMatchObject({ logo: "K1", name: "HSKK Sơ cấp" });
  });
});
