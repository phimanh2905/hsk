import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/* Mount better-auth. Đường dẫn thư mục phải khớp AUTH_BASE_PATH
   (`/api/v1/auth`) — better-auth tự kiểm tra basePath và trả 404 nếu lệch. */

export const dynamic = "force-dynamic";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler((request) =>
  getAuth().handler(request)
);