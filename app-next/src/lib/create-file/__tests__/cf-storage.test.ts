import { describe, it, expect, beforeEach } from "vitest";
import { loadCfState, persistCfState, hasFileCode, setFileCode, isLoggedInMock, CF_SESSION_KEY } from "../storage";
import { cfDefaults } from "../types";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("cf storage (sessionStorage nhai.cf.state + gate mock)", () => {
  it("persist → load roundtrip qua sessionStorage nhai.cf.state", () => {
    const st = { ...cfDefaults(), perRow: 9, tpl: "cover" };
    persistCfState(st);
    expect(sessionStorage.getItem(CF_SESSION_KEY)).toContain('"perRow":9');
    expect(loadCfState()?.perRow).toBe(9);
  });
  it("JSON hỏng / rỗng → null", () => {
    expect(loadCfState()).toBeNull();
    sessionStorage.setItem(CF_SESSION_KEY, "{broken");
    expect(loadCfState()).toBeNull();
  });
  it("fileCode mock", () => {
    expect(hasFileCode()).toBe(false);
    setFileCode();
    expect(hasFileCode()).toBe(true);
    expect(localStorage.getItem("nhai.fileCode")).toBe("1");
  });
  it("isLoggedInMock chỉ đọc localStorage nhai.mockLogin", () => {
    expect(isLoggedInMock()).toBe(false);
    localStorage.setItem("nhai.mockLogin", "1");
    expect(isLoggedInMock()).toBe(true);
  });
});
