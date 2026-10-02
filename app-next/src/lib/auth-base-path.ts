/* Spec 00 §8: better-auth dựng sẵn dưới prefix `/api/v1/auth`. Prefix này PHẢI khớp
   với Authorized redirect URI đã đăng ký ở Google Cloud Console
   (`https://<domain>/api/v1/auth/callback/google`) và với `basePath` của authClient.

   Tách riêng khỏi `auth.ts` vì file đó import better-auth server + drizzle; client
   component chỉ cần hằng này mà không được kéo cả server bundle theo. */
export const AUTH_BASE_PATH = "/api/v1/auth";