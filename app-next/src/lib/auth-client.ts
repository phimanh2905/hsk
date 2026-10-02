"use client";

import { createAuthClient } from "better-auth/react";
import { AUTH_BASE_PATH } from "@/lib/auth-base-path";

/* Client không cần baseURL: better-auth tự lấy origin từ window.location.
   `basePath` phải khớp AUTH_BASE_PATH, nếu không mọi call sẽ 404. */
export const authClient = createAuthClient({ basePath: AUTH_BASE_PATH });