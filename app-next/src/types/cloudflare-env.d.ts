/* Khai báo binding của Worker (wrangler.jsonc + wrangler.dev.jsonc) cho TypeScript.
   `CloudflareEnv` đã được @opennextjs/cloudflare khai báo global — ta chỉ bổ sung. */

export {};

declare global {
  interface CloudflareEnv {
    /* D1: prod = `hsk`, dev = `hsk-dev` (xem wrangler.jsonc / wrangler.dev.jsonc) */
    DB?: D1Database;
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
}