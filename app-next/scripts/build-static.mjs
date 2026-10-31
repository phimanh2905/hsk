// Tạm dời src/app/api (route handlers không export được) → next build export → trả lại.
// trap đảm bảo trả lại cả khi build fail.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, rmdirSync } from "node:fs";

const apiDir = "src/app/api";
const stashDir = "../.api-stash";

// Chạy dở (kill -9) để lại stash: nếu src/app/api đã mất mà stash còn api thì
// trả lại ngay — tuyệt đối không next build export khi api/ đang bị dời.
if (!existsSync(apiDir) && existsSync(`${stashDir}/api`)) {
  renameSync(`${stashDir}/api`, apiDir);
  try { rmdirSync(stashDir); } catch { /* non-empty: leave for inspection */ }
  console.error("FATAL: build-static đã bị ngang giữa lần chạy trước — src/app/api vừa được trả lại từ .api-stash. Chạy lại build.");
  process.exit(1);
}

mkdirSync(stashDir, { recursive: true });
// Stash rác từ lần chạy bị kill -9 (src/app/api vẫn còn nguyên): xoá trước để rename không đụng nhau.
if (existsSync(`${stashDir}/api`)) {
  rmSync(`${stashDir}/api`, { recursive: true, force: true });
  console.warn("warn: xoá .api-stash/api cũ (lần chạy trước bị kill giữa chừng)");
}

if (!existsSync(apiDir)) {
  console.error(`FATAL: ${apiDir} không tồn tại (và .api-stash cũng trống) — không thể dời api để build export.`);
  process.exit(1);
}

const restore = () => {
  if (existsSync(`${stashDir}/api`)) {
    renameSync(`${stashDir}/api`, apiDir);
    console.log("restored src/app/api");
  }
  try { rmdirSync(stashDir); } catch { /* non-empty: leave for inspection */ }
};
process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

renameSync(apiDir, `${stashDir}/api`);
try {
  execSync("EXPORT_BUILD=1 pnpm exec next build", { stdio: "inherit", env: process.env });
} finally {
  restore();
}
