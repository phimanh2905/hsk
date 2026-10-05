"use client";

/* Ma trận âm — port renderMatrix() của mock: thanh mẫu grouped 7 nhóm khẩu hình /
   vận mẫu grouped 4 nhóm; icard active + [BASE]; bấm ô phát âm. Presentational. */
import {
  PINYIN_LAB_GROUPS, PINYIN_LAB_BASE, PINYIN_LAB_FINALS, PINYIN_LAB_GROUP_OF,
} from "@/content/pinyin-lab";
import { cn } from "@/lib/cn";

const ICARD =
  "min-h-[76px] rounded-xl border border-border-subtle bg-surface-muted px-1.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-border-strong";

export function SoundMatrix({
  cat, art, sel, onSel, onSpeak,
}: {
  cat: "ini" | "fin";
  art: string;
  sel: string;
  onSel: (ch: string) => void;
  onSpeak: (s: string) => void;
}) {
  if (cat === "fin") {
    const want = art === "all" ? null : ({ simple: "Đơn", compound: "Kép", nasal: "Mũi" } as Record<string, string>)[art] ?? null;
    return (
      <div data-od-id="sound-matrix-body">
        {PINYIN_LAB_FINALS.filter((g) => !want || g.label.startsWith(want)).map((g) => (
          <section key={g.label}>
            <div data-group className="mb-2 mt-3.5 text-[11.5px] font-extrabold tracking-[0.06em] text-text-secondary first:mt-0">
              {g.label}
            </div>
            <div className="grid grid-cols-3 gap-2 min-[521px]:grid-cols-4">
              {g.items.map(([py, ex]) => (
                <button key={py} type="button" data-fin={py} onClick={() => onSpeak(ex.split(" ")[0])} className={cn(ICARD, "cursor-pointer")}>
                  <b className="block text-[22px] leading-[1.3] text-text-primary">{py}</b>
                  <small className="text-[11px] text-text-secondary">
                    <span className="zh">{ex.split(" ")[0]}</span> {ex.split(" ")[1]}
                  </small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div data-od-id="sound-matrix-body">
      {PINYIN_LAB_GROUPS.map((g) => {
        const items = g.items.filter((x) => {
          if (art === "all") return true;
          if (x === "w" || x === "y") return false; // mock: bán nguyên âm không thuộc nhóm art
          return PINYIN_LAB_GROUP_OF[x] === art;
        });
        if (!items.length) return null;
        return (
          <section key={g.label}>
            <div data-group className="mb-2 mt-3.5 text-[11.5px] font-extrabold tracking-[0.06em] text-text-secondary first:mt-0">
              {g.label}
            </div>
            <div className="grid grid-cols-3 gap-2 min-[521px]:grid-cols-4">
              {items.map((x) => (
                <button
                  key={x}
                  type="button"
                  data-ini={x}
                  onClick={() => onSel(x)}
                  className={cn(
                    ICARD,
                    "cursor-pointer",
                    x === sel && "border-2 border-action-primary bg-rose-wash px-1 py-2",
                  )}
                >
                  <b className="block text-[22px] leading-[1.3] text-text-primary">{x}</b>
                  <small className="font-mono text-[11px] text-text-secondary">[{PINYIN_LAB_BASE[x]}]</small>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
