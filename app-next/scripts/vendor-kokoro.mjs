/* Copy bundle kín của @uzen/kokoro-js ra public/ để browser nạp theo URL
   (kokoro-loader.ts). Chạy trước mọi build/dev — xem scripts trong package.json.
   File KHÔNG commit vào git: bundle minified chứa chuỗi khớp pattern secret của
   GitHub push protection (false positive), và copy từ node_modules luôn đảm bảo
   bản vendored khớp đúng version đã pin. */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "@uzen", "kokoro-js", "dist", "kokoro.web.js");
const dest = join(root, "public", "kokoro", "vendor", "kokoro.web.js");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`vendored kokoro.web.js -> ${dest}`);
