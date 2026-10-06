"use client";
/* Port 1:1 từ clone/js/hanzi.js buildSearchCard — card tìm chữ Hán (dùng ở màn 1 + sidebar màn 2).
   Gợi ý max 8: CJK substring trên key, hoặc pinyin/âm Hán Việt không dấu chứa query không dấu.
   go(ch) do caller cung cấp (router.push ở màn 1, location.assign ở sidebar màn 2). */
import { useEffect, useMemo, useRef, useState } from "react";
import { hanziChars } from "@/content/hanzi";
import { stripTones } from "@/lib/pinyin-utils";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";

function isCJK(s: string): boolean {
  return /[\u3400-\u9fff]/.test(s);
}

export function SearchCard({ go }: { go: (ch: string) => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);

  const hits = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    const qs = stripTones(query);
    const out: string[] = [];
    for (const k of Object.keys(hanziChars)) {
      const c = hanziChars[k];
      const hit =
        (isCJK(query) && k.indexOf(query) !== -1) ||
        stripTones(c.pinyin || "").indexOf(qs) !== -1 ||
        stripTones(c.hanViet || "").indexOf(qs) !== -1;
      if (hit) out.push(k);
    }
    return out.slice(0, 8);
  }, [q]);

  /* đóng dropdown khi click ngoài — port listener document trong clone */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={hostRef}>
      <Input
        data-q
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) go(hits[0]);
        }}
        placeholder="Nhập chữ Hán hoặc từ…"
        className="w-full zh"
        autoComplete="off"
      />
      {open && hits.length > 0 && (
        <div className="mt-2 rounded-card border border-border-default bg-surface-elevated divide-y divide-border-default max-h-64 overflow-y-auto">
          {hits.map((k) => {
            const c = hanziChars[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => go(k)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-paper"
              >
                <span className="zh text-2xl font-bold w-9 text-center">{k}</span>
                <span className="min-w-0">
                  <span className="font-semibold text-sm">
                    {c.pinyin || ""} · {c.hanViet || ""}
                  </span>
                  <span className="block text-xs text-text-secondary truncate">{c.meaning || ""}</span>
                </span>
                <Chip className="ml-auto text-xs shrink-0">{c.level || ""}</Chip>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
