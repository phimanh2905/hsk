"use client";

/* StrokeRules — 7 quy tắc thứ tự nét + card "3 nét cuối", port clone/js/radicals.js:291-343
   + SPEC-20 §B–C (dữ liệu từ @/content/strokeRules, Task 8). */

import { strokeRules, lastStrokes } from "@/content/strokeRules";

export default function StrokeRules() {
  return (
    <section className="mt-10">
      <h2 className="font-extrabold text-xl mb-1">Quy tắc thứ tự nét</h2>
      <p className="text-sm text-nhai-muted font-semibold mb-4">
        7 nguyên tắc cơ bản giúp bạn viết đúng thứ tự.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strokeRules.map((r) => (
          <div key={r.n} className="card p-3 flex items-center gap-3">
            <span className="flex-none w-8 h-8 rounded-full bg-[var(--nhai-main)] text-white text-sm font-extrabold flex items-center justify-center">
              {r.n}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm">{r.name}</h3>
              <p className="text-xs text-nhai-muted mt-0.5">{r.desc}</p>
            </div>
            <span
              className="flex-none w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: "var(--nhai-soft)", fontSize: 40, lineHeight: 1, color: "#1f2937" }}
            >
              {r.chars.join("")}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-4 p-4 rounded-lg"
        style={{ borderLeft: "4px solid var(--nhai-gold)", background: "var(--nhai-warn-bg, #fdf6e3)" }}
      >
        <h3 className="font-extrabold">⏳ Ba nét cuối luôn viết sau cùng</h3>
        <p className="text-sm mt-1">
          Những bộ thủ thường gặp như 辶 (走之), 廴 và ㄑ luôn nằm cuối cùng, dù nghĩa của chúng có liên quan đến
          điều gì đó trước đó.
        </p>
        <div className="flex gap-4 mt-3">
          {lastStrokes.map((it) => (
            <div key={it.glyph} className="flex flex-col items-center gap-1">
              <span
                className="w-14 h-14 rounded-lg flex items-center justify-center"
                style={{ background: "var(--nhai-soft)", fontSize: 36, lineHeight: 1, color: "#1f2937" }}
              >
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
