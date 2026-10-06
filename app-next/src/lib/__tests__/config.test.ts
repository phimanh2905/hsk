import { describe, expect, it, vi, beforeEach } from "vitest";

describe("SITE_URL (lib/config)", () => {
  beforeEach(() => vi.resetModules());

  it("throw khi thiếu NEXT_PUBLIC_SITE_URL ở production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    await expect(import("@/lib/config")).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("fallback localhost ở dev khi thiếu", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { SITE_URL } = await import("@/lib/config");
    expect(SITE_URL).toBe("http://localhost:3100");
  });

  it("bỏ dấu / thừa ở cuối", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://byehsk.example/");
    const { SITE_URL } = await import("@/lib/config");
    expect(SITE_URL).toBe("https://byehsk.example");
  });
});
