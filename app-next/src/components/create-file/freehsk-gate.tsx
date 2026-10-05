"use client";

/* Gate mã FREEHSK (G8, spec 12 — port clone/js/create-file.js badge gate).
   SP1 mock: nhập đúng "FREEHSK" → setFileCode() (bye.fileCode="1") + toast
   "Đã mở khóa in"; sai → toast hướng dẫn. UPG-2: badge "Đăng nhập để in" mở
   thẳng Login modal thật thay vì toast báo "chức năng đăng nhập mock". */

import React, { useState } from "react";
import { setFileCode } from "@/lib/create-file/storage";
import { useToast } from "@/components/shell/toast-provider";
import { useLoginModal } from "@/components/shell/login-modal";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function FreehskGate({ onUnlocked }: { onUnlocked: () => void }): React.JSX.Element {
  const [code, setCode] = useState("");
  const toast = useToast();
  const { openLogin } = useLoginModal();
  const { loggedIn } = useSession();

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
    <Card className="p-4 mt-2 no-print">
      <p className="text-sm font-bold mb-1">Mở khóa in / Lưu PDF</p>
      <p className="text-xs text-text-secondary mb-2">
        Nhập mã FREEHSK (xem mô tả nhóm Facebook) để in không giới hạn.
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        <Input
          data-testid="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Nhập mã"
          className="max-w-[160px]"
        />
        <Button type="button" data-testid="code-submit" size="sm" onClick={submit}>
          Mở khóa in
        </Button>
        {!loggedIn && (
          <Button type="button" variant="secondary" size="sm" className="no-print" onClick={openLogin}>
            Đăng nhập để in
          </Button>
        )}
      </div>
    </Card>
  );
}
