import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    ".wrangler/**",
    "next-env.d.ts",
  ]),
  {
    // Quy ước dự án (xem SDD ledger: ruling mount-gate): mọi trang đọc
    // localStorage/progress đều phải setState SAU mount để SSR prerender
    // khớp client (tránh hydration mismatch). Đó chính là pattern mà các rule
    // React Compiler dưới đây cảnh báo, nên hạ xuống "warn" thay vì error —
    // CI vẫn xanh, nhưng rule vẫn hiện để review khi code mới.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
