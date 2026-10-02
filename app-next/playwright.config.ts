import { defineConfig } from "@playwright/test";

// Port 3000 bị process khác chiếm trên máy dev này — dùng 3100.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
