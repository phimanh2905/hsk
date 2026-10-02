"use client";

/* StrokeRules — 7 quy tắc thứ tự nét + card "3 nét cuối", port clone/js/radicals.js:291-343
   + SPEC-20 §B–C (dữ liệu từ @/content/strokeRules, Task 8). */

import { strokeRules, lastStrokes } from "@/content/strokeRules";
import { Hourglass } from "@/components/ui/icon";

const glyphBox =
  "rounded-control flex items-center justify-center bg-surface-paper text-text-primary";

export default function StrokeRules() {
  return (
    <section className="mt-10">
      <h2 className="font-extrabold text-xl mb-1">Quy tắc thứ tự nét</h2>
      <p className="text-sm text-text-secondary font-semibold mb-4">
        7 nguyên tắc cơ bản giúp bạn viết đúng thứ tự.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strokeRules.map((r) => (
          <div
            key={r.n}
            className="rounded-card border border-border-default bg-surface-elevated p-3 flex items-center gap-3"
          >
            <span className="flex-none w-8 h-8 rounded-full bg-action-primary text-white text-sm font-extrabold flex items-center justify-center">
              {r.n}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm">{r.name}</h3>
              <p className="text-xs text-text-secondary mt-0.5">{r.desc}</p>
            </div>
            <span className={`${glyphBox} flex-none w-12 h-12 zh text-4xl leading-none`}>
              {r.chars.join("")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-control border-l-4 border-learning-streak bg-surface-elevated">
        <h3 className="font-extrabold inline-flex items-center gap-2">
          <Hourglass size={18} strokeWidth={1.5} aria-hidden="true" /> Ba nét cuối luôn viết sau cùng
        </h3>
        <p className="text-sm mt-1">
          Những bộ thủ thường gặp như 辶 (走之), 廴 và ㄑ luôn nằm cuối cùng, dù nghĩa của chúng có liên quan đến
          điều gì đó trước đó.
        </p>
        <div className="flex gap-4 mt-3">
          {lastStrokes.map((it) => (
            <div key={it.glyph} className="flex flex-col items-center gap-1">
              <span className={`${glyphBox} w-14 h-14 zh text-4xl leading-none`}>
                {it.glyph}
              </span>
              <span className="text-xs font-bold">{it.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
