"use client";

/* SettingsModal — port clone/js/shell.js:365-403 (toggleSettings).
   2 pill theme, 2 pill voice, 2 checkbox flags; ghi localStorage + áp theme ngay. */

import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

type Voice = "female" | "male";

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [voice, setVoice] = useState<Voice>("female");
  const [chatBubble, setChatBubble] = useState(true);
  const [selectionLookup, setSelectionLookup] = useState(true);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("nhai:open-settings", open);
    return () => window.removeEventListener("nhai:open-settings", open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      setVoice(localStorage.getItem("nhai.voice") === "male" ? "male" : "female");
      setChatBubble(localStorage.getItem("nhai.chatBubble") !== "0");
      setSelectionLookup(localStorage.getItem("nhai.selectionLookup") !== "0");
    } catch {
      /* silent */
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const on = (v: boolean) => (v ? "btn-main" : "btn-ghost");

  const pickTheme = (t: "light" | "dark") => {
    setTheme(t); // ghi localStorage + toggle html.dark ngay
  };
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try {
      localStorage.setItem("nhai.voice", v);
    } catch {
      /* silent */
    }
  };
  const toggleFlag = (key: "nhai.chatBubble" | "nhai.selectionLookup", checked: boolean) => {
    if (key === "nhai.chatBubble") setChatBubble(checked);
    else setSelectionLookup(checked);
    try {
      localStorage.setItem(key, checked ? "1" : "0");
    } catch {
      /* silent */
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="card shadow-neo w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-extrabold">⚙️ Cài đặt</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-ghost w-9 h-9"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-[var(--nhai-muted)] mb-4">
          Tùy chỉnh trải nghiệm học của bạn.
        </p>
        <div className="mb-5">
          <p className="text-sm font-bold mb-2">Giao diện</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-theme="light" className={`${on(theme === "light")} py-2`} onClick={() => pickTheme("light")}>
              ☀️ Sáng
            </button>
            <button type="button" data-theme="dark" className={`${on(theme === "dark")} py-2`} onClick={() => pickTheme("dark")}>
              🌙 Tối
            </button>
          </div>
        </div>
        <div className="mb-5">
          <p className="text-sm font-bold mb-2">Giọng đọc tiếng Trung</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-voice="female" className={`${on(voice === "female")} py-2`} onClick={() => pickVoice("female")}>
              👩 Nữ
            </button>
            <button type="button" data-voice="male" className={`${on(voice === "male")} py-2`} onClick={() => pickVoice("male")}>
              👨 Nam
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center justify-between card p-3 cursor-pointer">
            <span className="text-sm font-semibold">Bong bóng chat AI</span>
            <input
              type="checkbox"
              checked={chatBubble}
              onChange={(e) => toggleFlag("nhai.chatBubble", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between card p-3 cursor-pointer">
            <span className="text-sm font-semibold">Tra từ khi bôi đen</span>
            <input
              type="checkbox"
              checked={selectionLookup}
              onChange={(e) => toggleFlag("nhai.selectionLookup", e.target.checked)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
