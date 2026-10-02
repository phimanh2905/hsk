"use client";

/* Nút In / Lưu PDF + gate FREEHSK (G8). Port clone/js/create-file.js:117-118
   (canPrint = login OR fileCode). UPG-2: phần "login" giờ đọc session thật qua
   useSession() nên không cần debounce 300ms nghe click để re-check như SP1. */

import React, { useEffect, useState } from "react";
import { hasFileCode } from "@/lib/create-file/storage";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import { Printer, Lock } from "@/components/ui/icon";
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
      <Button type="button" className="no-print" onClick={() => window.print()}>
        <Printer size={18} strokeWidth={1.5} aria-hidden="true" />
        In / Lưu PDF
      </Button>
    );
  }
  return (
    <>
      <Button type="button" className="no-print" onClick={() => setGateOpen((v) => !v)}>
        <Lock size={18} strokeWidth={1.5} aria-hidden="true" />
        Đăng nhập để in
      </Button>
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
