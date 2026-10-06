"use client";

/* SettingsModal — port clone/js/shell.js:365-403 (toggleSettings).
   2 pill theme, 2 pill voice, 2 checkbox flags; ghi localStorage + áp theme ngay. */

import { useEffect, useState } from "react";
import { Moon, Settings as SettingsIcon, Sun, User, X, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getTtsOrchestrator, type TtsOrchestratorState } from "@/lib/tts/engine";
import { getEngineChoice, setEngineChoice, TIER_CONFIG } from "@/lib/tts/config";
import { useTheme } from "./theme-provider";

type Voice = "female" | "male";
type EnginePick = "auto" | "kokoro" | "system";

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [voice, setVoice] = useState<Voice>("female");
  const [chatBubble, setChatBubble] = useState(true);
  const [selectionLookup, setSelectionLookup] = useState(true);
  const [engine, setEngine] = useState<EnginePick>("auto");
  const [ttsState, setTtsState] = useState<TtsOrchestratorState>(() =>
    getTtsOrchestrator().getState()
  );

  useEffect(() => getTtsOrchestrator().subscribe(setTtsState), []);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("bye:open-settings", open);
    return () => window.removeEventListener("bye:open-settings", open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      setVoice(localStorage.getItem("bye.voice") === "male" ? "male" : "female");
      setChatBubble(localStorage.getItem("bye.chatBubble") !== "0");
      setSelectionLookup(localStorage.getItem("bye.selectionLookup") !== "0");
      setEngine(getEngineChoice() ?? "auto");
    } catch {
      /* silent */
    }
  }, [isOpen]);

  const on = (v: boolean) => (v ? "primary" : "secondary");

  const pickEngine = (pick: EnginePick) => {
    setEngine(pick);
    if (pick === "auto") {
      setEngineChoice(null);
      return;
    }
    setEngineChoice(pick === "kokoro" ? "kokoro" : "system");
    if (pick === "kokoro") void getTtsOrchestrator().preload();
  };

  const clearModelCache = async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => /transformers|kokoro/i.test(k))
          .map((k) => caches.delete(k))
      );
    } catch {
      /* silent */
    }
  };

  const pickTheme = (t: "light" | "dark") => {
    setTheme(t); // ghi localStorage + toggle html.dark ngay
  };
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try {
      localStorage.setItem("bye.voice", v);
    } catch {
      /* silent */
    }
  };
  const toggleFlag = (key: "bye.chatBubble" | "bye.selectionLookup", checked: boolean) => {
    if (key === "bye.chatBubble") setChatBubble(checked);
    else setSelectionLookup(checked);
    try {
      localStorage.setItem(key, checked ? "1" : "0");
    } catch {
      /* silent */
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      labelledBy="settings-modal-title"
      className="max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between mb-1">
        <h2 id="settings-modal-title" className="flex items-center gap-2 text-2xl font-extrabold">
          <SettingsIcon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" /> Cài đặt
        </h2>
        <IconButton label="Đóng" onClick={() => setIsOpen(false)}>
          <X size={18} strokeWidth={ICON_STROKE} />
        </IconButton>
      </div>
      <p className="text-sm text-text-secondary mb-4">Tùy chỉnh trải nghiệm học của bạn.</p>
      <div className="mb-5">
        <p className="text-sm font-bold mb-2">Giao diện</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            data-theme="light"
            variant={on(theme === "light")}
            onClick={() => pickTheme("light")}
          >
            <Sun size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Sáng
          </Button>
          <Button
            type="button"
            data-theme="dark"
            variant={on(theme === "dark")}
            onClick={() => pickTheme("dark")}
          >
            <Moon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Tối
          </Button>
        </div>
      </div>
      <div className="mb-5">
        <p className="text-sm font-bold mb-2">Giọng đọc tiếng Trung</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            data-voice="female"
            variant={on(voice === "female")}
            onClick={() => pickVoice("female")}
          >
            <User size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Nữ
          </Button>
          <Button
            type="button"
            data-voice="male"
            variant={on(voice === "male")}
            onClick={() => pickVoice("male")}
          >
            <User size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Nam
          </Button>
        </div>
      </div>
      <div className="mb-5">
        <p className="text-sm font-bold mb-2">Engine đọc tiếng Trung</p>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant={on(engine === "auto")} onClick={() => pickEngine("auto")}>
            Tự động
          </Button>
          <Button type="button" variant={on(engine === "kokoro")} onClick={() => pickEngine("kokoro")}>
            Bye HSK
          </Button>
          <Button type="button" variant={on(engine === "system")} onClick={() => pickEngine("system")}>
            Hệ thống
          </Button>
        </div>
        <div className="mt-2 text-xs text-text-secondary flex items-center gap-2">
          {ttsState.kind === "downloading" && (
            <span>
              Đang tải… {Math.round((ttsState.received / ttsState.total) * 100)}%
            </span>
          )}
          {ttsState.kind === "ready" && (
            <span>
              Đã sẵn sàng (
              {TIER_CONFIG[ttsState.tier as keyof typeof TIER_CONFIG]?.label ?? ttsState.tier})
              <button type="button" className="underline ml-1" onClick={() => void clearModelCache()}>
                Xóa model đã tải
              </button>
            </span>
          )}
          {ttsState.kind === "error" && (
            <span>
              Lỗi: {ttsState.message}
              <button
                type="button"
                className="underline ml-1"
                onClick={() => void getTtsOrchestrator().retryAfterError()}
              >
                Thử lại
              </button>
            </span>
          )}
          {engine === "kokoro" && ttsState.kind === "idle" && (
            <button
              type="button"
              className="underline"
              onClick={() => void getTtsOrchestrator().preload()}
            >
              Tải giọng đọc (156 MB)
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-card border border-border-default bg-surface-paper p-3 cursor-pointer">
          <span className="text-sm font-semibold">Bong bóng chat AI</span>
          <input
            type="checkbox"
            checked={chatBubble}
            onChange={(e) => toggleFlag("bye.chatBubble", e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between rounded-card border border-border-default bg-surface-paper p-3 cursor-pointer">
          <span className="text-sm font-semibold">Tra từ khi bôi đen</span>
          <input
            type="checkbox"
            checked={selectionLookup}
            onChange={(e) => toggleFlag("bye.selectionLookup", e.target.checked)}
          />
        </label>
      </div>
    </Dialog>
  );
}
