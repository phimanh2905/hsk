"use client";
/* Port 1:1 từ clone/js/hanzi.js (renderHome + buildSearchCard + buildDrawCard) — /hanzi màn 1.
   Search + dropdown gợi ý (max 8), card vẽ chữ (DrawPad), pills cấp độ + lưới chữ theo cấp. */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hanziChars, hanziLevels } from "@/content/hanzi";
import { DrawPad } from "@/components/hanzi/draw-pad";
import { useToastSafe } from "@/components/shell/toast-provider";
import { SearchCard } from "./search-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Search, Pencil } from "@/components/ui/icon";

export default function HanziHome() {
  const router = useRouter();
  const toast = useToastSafe();
  const books = useMemo(() => hanziLevels.filter((l) => !l.href), []);
  const radicalsLevel = hanziLevels.find((l) => l.href);
  const [levelIdx, setLevelIdx] = useState(0);

  const lv = books[levelIdx];
  const keys = useMemo(
    () => Object.keys(hanziChars).filter((k) => hanziChars[k].level === lv.label),
    [lv]
  );

  const go = (ch: string) => router.push("/hanzi/" + encodeURIComponent(ch));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Phân tích Hán tự</h1>
        <p className="text-sm text-text-secondary font-semibold mt-1">
          Gõ hoặc vẽ một chữ Hán để xem nghĩa, pinyin, âm Hán Việt, thứ tự nét, bộ thủ và cấu tạo chữ.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-4 sm:p-5">
          <h2 className="font-extrabold text-lg mb-3 inline-flex items-center gap-2">
            <Search size={18} strokeWidth={1.5} aria-hidden="true" /> Tìm chữ Hán
          </h2>
          <SearchCard go={go} />
        </div>
        <div className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-4 sm:p-5">
          <h2 className="font-extrabold text-lg mb-3 inline-flex items-center gap-2">
            <Pencil size={18} strokeWidth={1.5} aria-hidden="true" /> Hoặc vẽ chữ Hán
          </h2>
          <DrawPad size={240} onPick={go} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-extrabold text-xl mb-3">Khám phá chữ Hán theo cấp độ</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {books.map((l, i) => (
            <Chip
              key={l.id}
              selected={i === levelIdx}
              onClick={() => setLevelIdx(i)}
            >
              {l.label}
            </Chip>
          ))}
          {radicalsLevel && (
            <Link
              href={radicalsLevel.href!}
              className="inline-flex items-center gap-1.5 min-h-11 rounded-control border px-3 text-sm font-medium border-border-default bg-surface-elevated text-text-primary hover:border-action-primary hover:text-action-primary"
            >
              {radicalsLevel.label}
            </Link>
          )}
        </div>
        <div className="text-sm font-bold text-text-secondary mb-3">{lv.count}</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {["Flashcard", "Luyện viết", "Tạo file"].map((label) => (
            <Button
              key={label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => toast(label + " — tính năng demo, sắp ra mắt!")}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {keys.length === 0 ? (
            <p className="col-span-full text-sm text-text-secondary font-semibold py-6 text-center">
              Dữ liệu chữ Hán của cấp độ này sẽ được cập nhật sớm.
            </p>
          ) : (
            keys.map((k) => {
              const href = "/hanzi/" + encodeURIComponent(k);
              return (
                <a
                  key={k}
                  href={href}
                  title={k}
                  className="inline-flex items-center justify-center text-3xl sm:text-4xl zh font-bold rounded-control border border-border-default bg-surface-elevated shadow-xs hover:border-action-primary"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    go(k);
                  }}
                >
                  {k}
                </a>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
