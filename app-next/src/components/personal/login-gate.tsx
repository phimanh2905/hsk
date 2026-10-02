"use client";
import type { ReactNode } from "react";
import { Lock, ICON_STROKE } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card className="p-10 text-center">
      <div className="flex justify-center mb-4 text-text-secondary" aria-hidden="true">
        <Lock size={48} strokeWidth={ICON_STROKE} />
      </div>
      <h2 className="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>
      <p className="text-sm text-text-secondary mb-6">{pageSub}</p>
      <Button onClick={openLogin}>Đăng nhập</Button>
    </Card>
  );
}
