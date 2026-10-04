import { describe, it, expect } from "vitest";
import { pageTitle } from "../breadcrumb";

describe("pageTitle", () => {
  it("route có trong bảng", () => {
    expect(pageTitle("/")).toBe("Trang chủ");
    expect(pageTitle("/roadmap")).toBe("Lộ trình HSK");
    expect(pageTitle("/my-vocab")).toBe("Sổ tay từ vựng");
  });
  it("route chưa có bảng → fallback segment", () => {
    expect(pageTitle("/lesson/hsk1/lesson-3")).toBe("Lesson 3");
  });
});
