import { describe, it, expect } from "vitest";
import { pageTitle } from "../breadcrumb";

describe("pageTitle", () => {
  it("route có trong bảng", () => {
    expect(pageTitle("/")).toBe("Trang chủ");
    expect(pageTitle("/roadmap")).toBe("Lộ trình HSK");
    expect(pageTitle("/my-vocab")).toBe("Sổ tay từ vựng");
  });
  it("route nhiều tầng dùng segment đầu, không lộ id máy", () => {
    expect(pageTitle("/lesson/hsk1/lesson-3")).toBe("Bài học");
    expect(pageTitle("/notebook/vocab/abc123")).toBe("Sổ tay");
  });
  it("route ngoài nhóm (app) cũng có nhãn", () => {
    expect(pageTitle("/leaderboard")).toBe("Bảng xếp hạng");
    expect(pageTitle("/terms")).toBe("Điều khoản");
  });
  it("route chưa có bảng → fallback segment", () => {
    expect(pageTitle("/xyz/deep-slug")).toBe("Deep slug");
  });
});