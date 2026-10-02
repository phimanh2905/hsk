"use client";

/* Nút In / Lưu PDF + gate FREEHSK (G8). Port clone/js/create-file.js:117-118
   (canPrint = login OR fileCode). UPG-2: phần "login" giờ đọc session thật qua
   useSession() nên không cần debounce 300ms nghe click để re-check như SP1. */

import React, { useEffect, useState } from "react";
import { hasFileCode } from "@/lib/create-file/storage";
import { useSession } from "@/lib/use-session";
import FreehskGate from "./freehsk-gate";

export default function PrintButton(): React.JSX.Element {
  const { loggedIn } = useSession();
  const [codeUnlocked, setCodeUnlocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // hasFileCode đọc localStorage — chỉ đọc sau mount để server/client render
  // khớp nhau (nếu không sẽ hydration mismatch ở người dùng đã có mã).
  const [persistedCode, setPersistedCode] = useState(false);
  useEffect(() => setPersistedCode(hasFileCode()), []);

  const unlocked = loggedIn || codeUnlocked || persistedCode;

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
      {gateOpen && (
        <FreehskGate
          onUnlocked={() => {
            setCodeUnlocked(true);
            setGateOpen(false);
          }}
        />
      )}
    </>
  );
}