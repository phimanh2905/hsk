import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// `pnpm dev` đã mặc định chạy port 3100 (khớp BETTER_AUTH_URL và Authorized
// redirect URI trong Google Cloud Console), nên webServer chỉ cần gọi `pnpm dev`.

// READING_FAKE_LLM=1: generate bài đọc AI trả doc giả (spec reading-mine) —
// vô hại với spec khác vì chỉ route /api/v1/reading/generate đọc biến này.
// DEV_LOGIN_SECRET: lấy từ .env.local nếu có, fallback giá trị dev (route
// dev-login chỉ bật khi env set và NODE_ENV != production).
function readEnvLocal(key: string): string | undefined {
  try {
    const line = readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      READING_FAKE_LLM: "1",
      DEV_LOGIN_SECRET: readEnvLocal("DEV_LOGIN_SECRET") ?? "e2e-dev-secret",
    },
  },
});
