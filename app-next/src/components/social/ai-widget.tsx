"use client";

import { useEffect, useState } from "react";
import { Bot, Heart, MessageCircle, SendHorizontal, X, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/shell/toast-provider";
import { useSession } from "@/lib/use-session";

const REPLY_TEXT =
  "Mình là bản demo — thử bấm biểu tượng ngôi sao trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!";

export default function AiWidget() {
  const toast = useToast();
  const { loggedIn } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Xin chào! Mình là trợ lý Bye HSK. Hỏi về pinyin, từ vựng hoặc bấm một bài để học nhé!" },
  ]);
  // SP1 mock: chatBubble=0 chỉ ẩn nút mascot (giữ clone — panel vẫn mở được nếu đang mở)
  // Mount-gate: đọc localStorage SAU mount, nếu không server/client render
  // khác nhau khi user đã tắt bubble → hydration mismatch.
  const [bubbleHidden, setBubbleHidden] = useState(false);
  useEffect(() => {
    setBubbleHidden(localStorage.getItem("bye.chatBubble") === "0");
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
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-[600] flex flex-col items-end gap-2">
      {chatOpen ? (
        <Card shadow="md" className="w-80 p-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 font-bold text-sm">
              <Bot size={16} strokeWidth={ICON_STROKE} className="text-feature-ai" aria-hidden="true" />
              Tiểu Ngữ — trợ lý AI của Bye HSK
            </span>
            <IconButton label="Đóng chat" onClick={() => setChatOpen(false)}>
              <X size={14} strokeWidth={ICON_STROKE} />
            </IconButton>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  "rounded-control p-2 bg-surface-paper " + (m.role === "user" ? "ml-8" : "")
                }
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              className="flex-1"
              placeholder="Nhập câu hỏi…"
              aria-label="Nhập câu hỏi cho trợ lý AI"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <IconButton label="Gửi" variant="solid" onClick={send}>
              <SendHorizontal size={16} strokeWidth={ICON_STROKE} />
            </IconButton>
          </div>
        </Card>
      ) : null}

      {!bubbleHidden ? (
        <button
          type="button"
          className="relative w-[90px] h-[58px] rounded-card border border-border-default bg-surface-elevated shadow-md hover:-translate-y-0.5 transition-transform"
          aria-label="Hỏi AI"
          onClick={() => setChatOpen((v) => !v)}
        >
          <span className="absolute inset-0 flex items-center justify-center text-feature-ai" aria-hidden="true">
            <Bot size={30} strokeWidth={ICON_STROKE} />
          </span>
        </button>
      ) : null}

      <Button variant="ghost" size="sm" onClick={() => toast(loggedIn ? "Hộp tin nhắn đang được mở (demo)…" : "Tin nhắn chỉ khả dụng khi đăng nhập")}>
        <MessageCircle size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Nhắn tin
      </Button>
      <Button size="sm" onClick={() => toast("Cảm ơn bạn đã ủng hộ Bye HSK!")}>
        <Heart size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Ủng hộ Bye HSK
      </Button>
    </div>
  );
}
