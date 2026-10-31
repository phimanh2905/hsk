// Tạm dời src/app/api (route handlers không export được) → next build export → trả lại.
// trap đảm bảo trả lại cả khi build fail.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmdirSync } from "node:fs";

const apiDir = "src/app/api";
const stashDir = "../.api-stash";
mkdirSync(stashDir, { recursive: true });

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
