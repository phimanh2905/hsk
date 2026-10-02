"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/shell/toast-provider";
import { useSession } from "@/lib/use-session";

const REPLY_TEXT = "Mình là bản demo — thử bấm ⭐ trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!";

export default function AiWidget() {
  const toast = useToast();
  const { loggedIn } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Xin chào! Mình là trợ lý Nhai HSK. Hỏi về pinyin, từ vựng hoặc bấm một bài để học nhé!" },
  ]);
  // SP1 mock: chatBubble=0 chỉ ẩn nút mascot (giữ clone — panel vẫn mở được nếu đang mở)
  // Mount-gate: đọc localStorage SAU mount, nếu không server/client render
  // khác nhau khi user đã tắt bubble → hydration mismatch.
  const [bubbleHidden, setBubbleHidden] = useState(false);
  useEffect(() => {
    setBubbleHidden(localStorage.getItem("nhai.chatBubble") === "0");
  }, []);

  function send() {
    const value = input.trim();
    if (!value) return;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: REPLY_TEXT }]);
    }, 400);
  }

  return (
    <div className="fixed right-4 bottom-6 z-[600] flex flex-col items-end gap-2">
      {chatOpen ? (
        <div className="card shadow-neo w-80 p-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">🤖 Tiểu Ngữ — trợ lý AI của Nhai HSK</span>
            <button type="button" className="btn-ghost w-7 h-7 text-xs" aria-label="Đóng chat" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 bg-[var(--nhai-soft)] rounded-lg p-2">{m.text}</div>
              ) : (
                <div key={i} className="bg-[var(--nhai-soft)] rounded-lg p-2">{m.text}</div>
              )
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 border-2 border-[var(--nhai-border)] rounded-lg px-2 py-1.5 bg-[var(--nhai-bg)]"
              placeholder="Nhập câu hỏi…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button type="button" className="btn-main px-3" onClick={send}>➤</button>
          </div>
        </div>
      ) : null}

      {!bubbleHidden ? (
        <button type="button" className="card shadow-neo relative w-[90px] h-[58px] hover:-translate-y-0.5 transition-transform" aria-label="🤖 Hỏi AI" onClick={() => setChatOpen((v) => !v)}>
          <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden="true">🤖</span>
          <span className="absolute bottom-0.5 right-1 text-lg -rotate-12" aria-hidden="true">🍅</span>
        </button>
      ) : null}

      <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => toast(loggedIn ? "Hộp tin nhắn đang được mở (demo)…" : "Tin nhắn chỉ khả dụng khi đăng nhập")}>
        💬 Nhắn tin
      </button>
      <button type="button" className="btn-main px-3 py-2 text-sm" onClick={() => toast("Cảm ơn bạn đã ủng hộ Nhai HSK! ❤️")}>
        ❤️ Ủng hộ Nhai HSK
      </button>
    </div>
  );
}

