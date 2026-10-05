import { describe, it, expect, beforeEach } from "vitest";
import { getShadowFont, setShadowFont, getAutoscroll, setAutoscroll } from "../prefs";

beforeEach(() => localStorage.clear());

it("font mặc định lg, lưu + đọc lại", () => {
  expect(getShadowFont()).toBe("lg");
  setShadowFont("sm");
  expect(getShadowFont()).toBe("sm");
  expect(localStorage.getItem("bye.shadow.font")).toBe("sm");
});
it("autoscroll mặc định true, '0' tắt", () => {
  expect(getAutoscroll()).toBe(true);
  setAutoscroll(false);
  expect(getAutoscroll()).toBe(false);
  localStorage.setItem("bye.shadow.autoscroll", "1");
  expect(getAutoscroll()).toBe(true);
});
