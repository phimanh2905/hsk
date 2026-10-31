import { describe, it, expect, beforeEach } from "vitest";
import { setWorkerEnv, getEnv, resetWorkerEnvForTest } from "@/lib/env";

describe("getEnv", () => {
  beforeEach(() => resetWorkerEnvForTest());

  it("trả về env set bởi worker entry (prod)", () => {
    setWorkerEnv({ DB: {} as never });
    expect(getEnv()).toEqual({ DB: {} });
  });

  it("reset xong throw vì không còn worker env và không có Cloudflare context", () => {
    expect(() => getEnv()).toThrow();
  });
});
