"use client";

/* Mount 1 lần ở root layout: kích hoạt HybridStore và đẩy trạng thái session
   vào máy sync (login → merge-push 2 chiều; logout → ngừng flush). */

import { useEffect } from "react";
import { useSession } from "@/lib/use-session";
import { initHybridStore, hybridOnAuthChange } from "@/lib/store/hybrid-store";

export function HybridSyncProvider() {
  const { loggedIn, isPending } = useSession();

  // Khởi tạo store đúng 1 lần (idempotent, trả cleanup — an toàn với StrictMode).
  useEffect(() => {
    return initHybridStore();
  }, []);

  // Session chỉ được đẩy vào máy sync sau khi better-auth trả lời xong,
  // tránh toggle logout/login ảo trong lúc isPending.
  useEffect(() => {
    if (!isPending) hybridOnAuthChange(loggedIn);
  }, [loggedIn, isPending]);

  return null;
}
