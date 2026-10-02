"use client";

/* LoginModal — port clone/js/shell.js:300-355 (openLogin + renderLoggedIn).
   SP1 từng mock: bấm Google/Apple/Email → set `nhai.mockLogin`. UPG-2 thay bằng
   better-auth: chỉ còn Google (spec 00 §1 — Apple ở site gốc là bịa, đã bỏ). */

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { authClient } from "@/lib/auth-client";

type LoginCtx = { isOpen: boolean; openLogin: () => void; close: () => void };

const LoginContext = createContext<LoginCtx | null>(null);

export function useLoginModal(): LoginCtx {
  const v = useContext(LoginContext);
  if (!v) throw new Error("useLoginModal phải dùng bên trong <LoginProvider>");
  return v;
}

export function LoginProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <LoginContext.Provider
      value={{ isOpen, openLogin: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </LoginContext.Provider>
  );
}

export function LoginModal() {
  const { isOpen, close } = useLoginModal();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/",
    });
    // Không có error ⇒ Google đã redirect, dòng dưới không chạy tới.
    setBusy(false);
    if (err) setError(err.message ?? "Đăng nhập Google thất bại. Thử lại hoặc kiểm tra kết nối.");
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="card shadow-neo w-full max-w-md p-6" role="dialog" aria-label="Đăng nhập">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold">Đăng nhập</h2>
          <button type="button" onClick={close} className="btn-ghost w-9 h-9" aria-label="Đóng">
            ✕
          </button>
        </div>
        <p className="text-sm text-[var(--nhai-muted)] mb-4">
          Đồng bộ tiến trình học của bạn
        </p>
        <button
          type="button"
          className="btn-ghost w-full py-2.5 mb-3 disabled:opacity-60"
          disabled={busy}
          onClick={signInWithGoogle}
        >
          {busy ? "Đang chuyển tới Google…" : "🔵 Đăng nhập bằng Google"}
        </button>
        {error ? (
          <p role="alert" className="text-sm text-red-600 mb-3">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-[var(--nhai-muted)] mt-3">
          Bằng việc đăng nhập, bạn đồng ý với{" "}
          <Link href="/terms" className="text-[var(--nhai-accent)]">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="/privacy" className="text-[var(--nhai-accent)]">
            Chính sách quyền riêng tư
          </Link>
          .
        </p>
      </div>
    </div>
  );
}