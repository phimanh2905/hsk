"use client";

/* Nút In / Lưu PDF + gate FREEHSK (G8). Port clone/js/create-file.js:117-118
   (canPrint = mock-login OR fileCode) và syncPrintBtn (dòng 819 debounce 300ms
   nghe click document để re-check sau login/redeem). Chưa unlock → nút
   "🔒 Đăng nhập để in" mở FreehskGate. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { hasFileCode, isLoggedInMock } from "@/lib/create-file/storage";
import FreehskGate from "./freehsk-gate";

export default function PrintButton(): React.JSX.Element {
  const [unlocked, setUnlocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    setUnlocked(isLoggedInMock() || hasFileCode());
  }, []);

  useEffect(() => {
    sync();
    const onClick = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(sync, 300); // port clone dòng 819
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sync]);

  if (unlocked) {
    return (
      <button type="button" className="btn-main no-print" onClick={() => window.print()}>
        🖨 In / Lưu PDF
      </button>
    );
  }
  return (
    <>
      <button type="button" className="btn-main no-print" onClick={() => setGateOpen((v) => !v)}>
        🔒 Đăng nhập để in
      </button>
      {gateOpen && <FreehskGate onUnlocked={() => { sync(); setGateOpen(false); }} />}
    </>
  );
}
