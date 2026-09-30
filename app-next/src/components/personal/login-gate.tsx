"use client";
import { useEffect, useState, type ReactNode } from "react";
import { progressStore } from "@/lib/store/progress-store";
import { useLoginModal } from "@/components/shell/login-modal";

// SP1 mock — UPG-2 sẽ thay bằng server session check better-auth (spec 11 §F6).
export function LoginGate({ pageSub, children }: { pageSub: string; children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false); // SSR nhất quán: render gate trước, sync sau mount
  const [mounted, setMounted] = useState(false);
  const { openLogin } = useLoginModal();
  useEffect(() => {
    const sync = () => setLoggedIn(progressStore.isLoggedIn());
    sync();
    setMounted(true);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);
  if (mounted && loggedIn) return <>{children}</>;
  return (
    <div className="card shadow-neo p-10 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
      <h2 className="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>
      <p className="text-sm text-[var(--nhai-muted)] mb-6">{pageSub}</p>
      <button type="button" onClick={openLogin} className="btn-main px-6 py-2.5">Đăng nhập</button>
    </div>
  );
}
