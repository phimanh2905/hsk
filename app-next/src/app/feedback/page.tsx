"use client";

import { useState } from "react";
import { progressStore } from "@/lib/store/progress-store";
import { useToast } from "@/components/shell/toast-provider";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    // localStorage có thể bị chặn — vẫn hiện toast (giữ try/catch của clone/js/feedback.js)
    try {
      progressStore.appendFeedback({ text: value, at: new Date().toISOString() });
    } catch {
      /* bỏ qua */
    }
    setText("");
    toast("Cảm ơn bạn! Góp ý đã được ghi nhận.");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Góp ý</h1>
      <p className="text-[var(--nhai-muted)] mb-5">Cảm nhận của bạn giúp Nhai HSK tốt hơn…</p>

      <form onSubmit={handleSubmit} className="card shadow-neo p-5">
        <label htmlFor="feedback-text" className="block text-sm font-bold mb-2">Nội dung góp ý</label>
        <textarea
          id="feedback-text"
          rows={6}
          required
          placeholder="Cảm nhận của bạn giúp Nhai HSK tốt hơn…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 mb-4 bg-[var(--nhai-bg)] focus:outline-none focus:border-[var(--nhai-main)]"
        />
        <button type="submit" className="btn-main px-6 py-2.5">Gửi góp ý</button>
      </form>
    </main>
  );
}
