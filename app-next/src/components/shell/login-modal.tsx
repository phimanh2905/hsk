"use client";

/* LoginModal — port clone/js/shell.js:300-355 (openLogin + renderLoggedIn).
   SP1 từng mock: bấm Google/Apple/Email → set `bye.mockLogin`. UPG-2 thay bằng
   better-auth: chỉ còn Google (spec 00 §1 — Apple ở site gốc là bịa, đã bỏ). */

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { X } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onClose={close} labelledBy="login-modal-title">
      <div className="flex items-start justify-between mb-2">
        <h2 id="login-modal-title" className="text-2xl font-extrabold">
          Đăng nhập
        </h2>
        <IconButton label="Đóng" onClick={close}>
          <X size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
      <p className="text-sm text-text-secondary mb-4">Đồng bộ tiến trình học của bạn</p>
      <Button
        type="button"
        variant="secondary"
        className="w-full mb-3"
        loading={busy}
        onClick={signInWithGoogle}
      >
        {busy ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-feedback-error-text mb-3">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-text-secondary mt-3">
        Bằng việc đăng nhập, bạn đồng ý với{" "}
        <Link href="/terms" className="text-action-primary">
          Điều khoản sử dụng
        </Link>{" "}
        và{" "}
        <Link href="/privacy" className="text-action-primary">
          Chính sách quyền riêng tư
        </Link>
        .
      </p>
    </Dialog>
  );
}
