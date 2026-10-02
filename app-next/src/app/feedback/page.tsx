"use client";

import { useState } from "react";
import { progressStore } from "@/lib/store/progress-store";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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
    <main className="mx-auto max-w-[760px] px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Góp ý</h1>
      <p className="text-text-secondary mb-5">Cảm nhận của bạn giúp Nhai HSK tốt hơn…</p>

      <form onSubmit={handleSubmit}>
        <Card className="p-5">
          <label htmlFor="feedback-text" className="block text-sm font-bold mb-2">Nội dung góp ý</label>
          <Textarea
            id="feedback-text"
            rows={6}
            required
            placeholder="Cảm nhận của bạn giúp Nhai HSK tốt hơn…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full mb-4"
          />
          <Button type="submit">Gửi góp ý</Button>
        </Card>
      </form>
    </main>
  );
}
