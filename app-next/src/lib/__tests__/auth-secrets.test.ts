import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthSecrets } from "@/lib/auth-secrets";

const BINDING = { BETTER_AUTH_SECRET: "s-binding", GOOGLE_CLIENT_ID: "i-binding", GOOGLE_CLIENT_SECRET: "g-binding" };

afterEach(() => vi.unstubAllEnvs());

describe("resolveAuthSecrets", () => {
  it("ưu tiên env binding (wrangler) hơn process.env", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    expect(resolveAuthSecrets(BINDING, "development").BETTER_AUTH_SECRET).toBe("s-binding");
  });

  it("ở dev: fallback process.env khi binding thiếu", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    vi.stubEnv("GOOGLE_CLIENT_ID", "i-dotenv");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "g-dotenv");
    const s = resolveAuthSecrets({}, "development");
    expect(s).toEqual({ BETTER_AUTH_SECRET: "s-dotenv", GOOGLE_CLIENT_ID: "i-dotenv", GOOGLE_CLIENT_SECRET: "g-dotenv" });
  });

  it("ở production: KHÔNG fallback process.env → throw khi binding thiếu", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    expect(() => resolveAuthSecrets({}, "production")).toThrow(/Thiếu BETTER_AUTH_SECRET/);
  });

  it("throw khi thiếu hoàn toàn kể cả ở dev", () => {
    expect(() => resolveAuthSecrets({}, "development")).toThrow(/Thiếu BETTER_AUTH_SECRET/);
  });
});
