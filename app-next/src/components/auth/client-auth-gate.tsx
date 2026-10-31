"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLoginModal } from "@/components/shell/login-modal";

/* Client-gate thay server-gate (SSG): API vẫn tự check session nên an toàn —
   dữ liệu user là localStorage + rows của chính họ. */
export default function ClientAuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { openLogin } = useLoginModal();

  useEffect(() => {
    if (!isPending && !session) {
      openLogin(); // parity với server-gate: modal đăng nhập tự mở khi bị chặn
      router.replace("/?login=1");
    }
  }, [isPending, session, router, openLogin]);

  if (isPending || !session) {
    return (
      <div
        aria-busy="true"
        className="min-h-[40vh] animate-pulse bg-surface-muted"
      />
    );
  }
  return <>{children}</>;
}
