import { defineConfig } from "@playwright/test";

// `pnpm dev` đã mặc định chạy port 3100 (khớp BETTER_AUTH_URL và Authorized
// redirect URI trong Google Cloud Console), nên webServer chỉ cần gọi `pnpm dev`.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
