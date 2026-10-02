"use client";

/* Gate mã FREEHSK (G8, spec 12 — port clone/js/create-file.js badge gate).
   Mock SP1: nhập đúng "FREEHSK" → setFileCode() (nhai.fileCode="1") + toast
   "Đã mở khóa in."; sai → toast hướng dẫn. Shape UI giữ nguyên để UPG-4
   chỉ thay logic check. Badge "Đăng nhập để in" — shell learning-core chưa
   expose event "nhai:open-login" nên hiện toast fallback. */

import React, { useState } from "react";
import { setFileCode, isLoggedInMock } from "@/lib/create-file/storage";
import { useToast } from "@/components/shell/toast-provider";

export default function FreehskGate({ onUnlocked }: { onUnlocked: () => void }): React.JSX.Element {
  const [code, setCode] = useState("");
  const toast = useToast();

  const submit = () => {
    if (code.trim() === "FREEHSK") {
      setFileCode();
      toast("Đã mở khóa in.");
      onUnlocked();
      return;
    }
    toast("Mã không đúng. Mã nằm ở mô tả nhóm Facebook");
  };

  return (
    <div className="card p-3 mt-2 no-print" style={{ background: "#fdf6d8" }}>
      <p className="text-sm font-bold mb-1">Mở khóa in / Lưu PDF</p>
      <p className="text-xs text-[var(--nhai-muted)] mb-2">
        Nhập mã FREEHSK (xem mô tả nhóm Facebook) để in không giới hạn.
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        <input
          data-testid="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Nhập mã"
          className="rounded-md border-2 border-[var(--nhai-border)] px-2 py-1 text-sm"
          style={{ maxWidth: 160 }}
        />
        <button type="button" data-testid="code-submit" className="btn-main text-sm" onClick={submit}>
          Mở khóa in
        </button>
        {!isLoggedInMock() && (
          <button
            type="button"
            className="pill text-sm no-print"
            onClick={() => toast("Chức năng đăng nhập mock nằm ở menu trên.")}
          >
            Đăng nhập để in
          </button>
        )}
      </div>
    </div>
  );
}
