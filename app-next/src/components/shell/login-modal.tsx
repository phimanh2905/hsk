"use client";

/* LoginModal (mock) — port clone/js/shell.js:300-355 (openLogin + renderLoggedIn).
   Mock: bấm Google/Apple/Email → nhai.mockLogin = "1", nhai.mockName từ input
   (mặc định "T"), đóng modal, dispatch "nhai:progress" để Topbar render lại. */

import { createContext, useContext, useEffect, useState } from "react";

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

/* Hook: đăng nhập mock đã bật chưa (nhai.mockLogin === "1"), sync qua "nhai:progress". */
export function useMockLogin(): { loggedIn: boolean; name: string; logout: () => void } {
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState("T");

  useEffect(() => {
    const sync = () => {
      try {
        setLoggedIn(localStorage.getItem("nhai.mockLogin") === "1");
        setName(localStorage.getItem("nhai.mockName") || "T");
      } catch {
        /* silent */
      }
    };
    sync();
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);

  const logout = () => {
    try {
      localStorage.removeItem("nhai.mockLogin");
    } catch {
      /* silent */
    }
    window.dispatchEvent(new CustomEvent("nhai:progress"));
  };

  return { loggedIn, name, logout };
}

function mockLogin(nameInput: string) {
  const name = nameInput.trim() || "T";
  try {
    localStorage.setItem("nhai.mockLogin", "1");
    localStorage.setItem("nhai.mockName", name);
  } catch {
    /* silent */
  }
  window.dispatchEvent(new CustomEvent("nhai:progress"));
}

export function LoginModal() {
  const { isOpen, close } = useLoginModal();
  const [name, setName] = useState("");
  if (!isOpen) return null;
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
          className="btn-ghost w-full py-2.5 mb-2"
          onClick={() => {
            mockLogin(name);
            close();
          }}
        >
          🔵 Google
        </button>
        <button
          type="button"
          className="btn-ghost w-full py-2.5 mb-3"
          onClick={() => {
            mockLogin(name);
            close();
          }}
        >
          Apple
        </button>
        <div className="flex items-center gap-3 my-3 text-xs text-[var(--nhai-muted)]">
          <span className="flex-1 border-t border-[var(--nhai-border)]" />
          HOẶC
          <span className="flex-1 border-t border-[var(--nhai-border)]" />
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên của bạn (mặc định T)"
          className="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 mb-3 bg-[var(--nhai-bg)]"
        />
        <button
          type="button"
          className="btn-main w-full py-2.5"
          onClick={() => {
            mockLogin(name);
            close();
          }}
        >
          ✉️ Email
        </button>
        <p className="text-xs text-[var(--nhai-muted)] mt-3">
          Bản demo — mọi provider chỉ lưu mock trong localStorage.
        </p>
      </div>
    </div>
  );
}
