"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast-provider";

export default function DeleteAccountPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    toast("Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email " + value + ".");
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Xoá tài khoản</h1>
      <p className="text-[var(--nhai-muted)] mb-6">Nhập email của tài khoản để yêu cầu xoá vĩnh viễn. Toàn bộ tiến trình học, từ vựng đã lưu và dữ liệu liên quan sẽ bị xoá và không thể khôi phục.</p>

      <form onSubmit={handleSubmit} className="card shadow-neo p-5">
        <label htmlFor="delete-email" className="block text-sm font-bold mb-2">Email tài khoản</label>
        <input
          id="delete-email"
          type="email"
          required
          placeholder="email@example.com"
          disabled={sent}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2.5 mb-4 bg-[var(--nhai-bg)] focus:outline-none focus:border-[var(--nhai-main)] disabled:opacity-60"
        />
        <button type="submit" disabled={sent} className={(sent ? "btn-ghost" : "btn-main") + " px-6 py-2.5 disabled:opacity-60"}>
          {sent ? "Đã gửi yêu cầu" : "Yêu cầu xoá"}
        </button>
      </form>
    </main>
  );
}
