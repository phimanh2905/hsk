"use client";

/* Inspector — port aside.insp của mock: sticky phải, big/desc/tip khẩu hình,
   bảng 4 thanh điệu với speaker từng hàng, nút drill sang quiz. */
import { Volume2 } from "@/components/ui/icon";
import { PINYIN_LAB_DESC, PINYIN_LAB_TIP, PINYIN_LAB_TONES } from "@/content/pinyin-lab";

export function SoundInspector({
  sel, onDrill, onSpeak,
}: {
  sel: string;
  onDrill: (ch: string) => void;
  onSpeak: (s: string) => void;
}) {
  const isSemi = sel === "w" || sel === "y";
  const rows = PINYIN_LAB_TONES[sel] ?? []; // sel có thể ngoài data — an toàn (Review Focus #4)

  return (
    <aside
      data-od-id="sound-inspector"
      aria-label="Chi tiết âm"
      className="self-start max-lg:static lg:sticky lg:top-20 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]"
    >
      <div className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs">
        <h2 className="text-sm font-bold text-text-primary">
          Âm đang chọn: {sel}
          {isSemi ? " (bán nguyên âm)" : " (thanh mẫu)"}
        </h2>
        <div className="mt-1 text-[44px] leading-[1.2] text-text-primary">{sel}</div>
        <p className="mb-1 mt-1.5 text-[13px] text-text-secondary">{PINYIN_LAB_DESC[sel] ?? ""}</p>
        <div className="mb-3 rounded-[10px] border border-border-subtle bg-surface-muted px-3 py-2.5 text-[12.5px] text-text-secondary">
          Khẩu hình: {PINYIN_LAB_TIP[sel] ?? ""}
        </div>
        <h2 className="mb-2 text-sm font-bold text-text-primary">Bảng ghép 4 thanh điệu</h2>
        <div className="grid gap-[7px]">
          {rows.map(([py, zh, vi]) => (
            <div
              key={py}
              className="flex items-center gap-2.5 rounded-[10px] border border-border-subtle bg-surface-muted px-2.5 py-2 text-[13.5px] text-text-primary"
            >
              <b className="min-w-[44px]">{py}</b>
              <span className="zh">{zh}</span>
              <small className="text-text-secondary">{vi}</small>
              <button
                type="button"
                aria-label={`Nghe ${py}`}
                onClick={() => onSpeak(py)}
                className="ml-auto grid h-8 w-8 min-w-8 place-items-center rounded-lg border border-border-subtle bg-surface-elevated text-action-primary hover:border-action-primary"
              >
                <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onDrill(sel)}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border bg-transparent px-5 font-semibold text-action-primary transition-colors hover:bg-rose-wash"
          style={{ borderColor: "color-mix(in srgb, var(--action-primary) 40%, transparent)" }}
        >
          Luyện riêng với âm này
        </button>
      </div>
    </aside>
  );
}
