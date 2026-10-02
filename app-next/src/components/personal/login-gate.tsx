"use client";
import type { ReactNode } from "react";
import { useSession } from "@/lib/use-session";
import { useLoginModal } from "@/components/shell/login-modal";

/* UPG-2 — session thật từ better-auth, thay cho `nhai.mockLogin` của SP1.
   Vẫn gate ở client: các trang dùng nó vốn đã là client component, còn đọc
   session trong layout chung sẽ kéo cả nhóm route về dynamic và mất SSG.
   Spec 11 §F6 muốn server-render gate — để lát cắt UPG-2 tiếp theo, kèm route
   group riêng cho 4 route gated. */
export function LoginGate({ pageSub, children }: { pageSub: string; children: ReactNode }) {
  const { loggedIn } = useSession();
  const { openLogin } = useLoginModal();
  if (loggedIn) return <>{children}</>;
  return (
    <div className="card shadow-neo p-10 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
      <h2 className="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>
      <p className="text-sm text-[var(--nhai-muted)] mb-6">{pageSub}</p>
      <button type="button" onClick={openLogin} className="btn-main px-6 py-2.5">Đăng nhập</button>
    </div>
  );
}