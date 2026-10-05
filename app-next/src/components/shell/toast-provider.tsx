"use client";

/* ToastProvider — port clone/js/shell.js:20-27 (BYE.toast).
   Chỉ 1 toast tại một thời điểm, tự ẩn sau 2600ms. */

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastFn = (msg: string) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const fn = useContext(ToastContext);
  if (!fn) throw new Error("useToast phải dùng bên trong <ToastProvider>");
  return fn;
}

/* Biến thể an toàn cho mode có thể được render ngoài provider (test/mount đơn lẻ):
   không có provider → no-op thay vì throw. */
export function useToastSafe(): ToastFn {
  return useContext(ToastContext) ?? (() => {});
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ToastFn>((m: string) => {
    setMsg(m);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {msg !== null && (
        <div
          role="status"
          className="fixed left-1/2 bottom-7 -translate-x-1/2 z-[2147483000] bg-surface-elevated text-text-primary border border-border-default shadow-md rounded-control px-4 py-2.5 text-sm font-semibold"
        >
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}
