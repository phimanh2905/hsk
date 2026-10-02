import { describe, it, expect } from "vitest";
import { sessionStatus } from "../roadmap-status";

describe("sessionStatus", () => {
  it("buổi 1 mở sẵn (current) khi chưa done", () => {
    expect(sessionStatus([], 1)).toBe("current");
  });
  it("buổi N khóa khi buổi N-1 chưa done", () => {
    expect(sessionStatus([], 2)).toBe("locked");
    expect(sessionStatus([1], 3)).toBe("locked");
  });
  it("buổi N mở khi buổi N-1 done; done giữ trạng thái", () => {
    expect(sessionStatus([1], 2)).toBe("current");
    expect(sessionStatus([1, 2], 2)).toBe("done");
    expect(sessionStatus([1, 2, 3], 2)).toBe("done");
  });
});
