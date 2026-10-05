"use client";

/* Hook session thật, thay cho `useMockLogin` (đọc localStorage `bye.mockLogin`).
   better-auth tự đồng bộ atom session qua BroadcastChannel + focus event, nên
   đăng nhập ở một tab là các tab khác tự cập nhật — không cần event `bye:progress`. */

import { useCallback } from "react";
import { authClient } from "@/lib/auth-client";

export type SessionState = {
  loggedIn: boolean;
  name: string;
  image: string | null;
  isPending: boolean;
  logout: () => Promise<void>;
};

export function useSession(): SessionState {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;

  const logout = useCallback(async () => {
    await authClient.signOut();
  }, []);

  return {
    loggedIn: user !== null,
    name: user?.name ?? "",
    image: user?.image ?? null,
    isPending,
    logout,
  };
}