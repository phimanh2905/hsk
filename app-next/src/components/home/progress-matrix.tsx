"use client";

/* Progress matrix (port section .matrix của opendesign index.html, spec 2026-10-04):
   card Lộ trình (donut + stat rows) + card Công cụ bổ trợ nhanh.
   Hydration gate: trước mounted useHomeSummary trả EMPTY (vocabMastered=0…) →
   donut & stat rows render 0/0 an toàn, giống hệt server.
   Lưu ý: children <text> của DonutRing dùng toạ độ cứng x=48 cho size 96
   (viewBox 0 0 size size) — nếu đổi size phải đổi toạ độ tương ứng. */

import Link from "next/link";
import { BookOpenText, BookmarkCheck, PenTool, Target, Volume2, ICON_STROKE } from "@/components/ui/icon";
import { DonutRing } from "@/components/ui/donut-ring";
import { IconTile } from "@/components/ui/icon-tile";
import { useHomeSummary } from "@/lib/home-summary";

const TOOLS = [
  { href: "/hanzi", name: "Hanzi Studio", zh: "写字", desc: "Luyện viết nét & bộ thủ", Icon: PenTool },
  { href: "/pinyin", name: "Bảng âm Pinyin", zh: null, desc: "Quy tắc ngữ âm & biến điệu", Icon: Volume2 },
  { href: "/my-vocab", name: "Sổ tay từ vựng", zh: null, desc: "Từ đã lưu & ghi chú", Icon: BookmarkCheck },
  { href: "/reading", name: "Thư viện bài đọc", zh: null, desc: "Truyện ngắn theo cấp độ", Icon: BookOpenText },
] as const;

export default function ProgressMatrix() {
  const s = useHomeSummary();
  const vocabMastered = s.mounted ? s.vocabMastered : 0;
  const vocabTotal = s.vocabTotal;
  const pct = vocabTotal > 0 ? Math.round((vocabMastered / vocabTotal) * 100) : 0;

  return (
    <section aria-label="Tiến độ tổng thể và công cụ" className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
      {/* Card A — lộ trình */}
      <div className="rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs">
        <h3 className="flex items-center gap-2 text-[14.5px] font-bold">
          <Target size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-text-secondary" />
          Lộ trình HSK
        </h3>
        <p className="mb-4 mt-1.5 text-[13px] text-text-secondary">Nắm vững nền tảng trước khi lên cấp tiếp theo</p>
        <div className="flex items-center gap-4">
          <DonutRing value={vocabMastered} total={vocabTotal} size={96} strokeWidth={9} label={`Đã nhớ ${vocabMastered} trên ${vocabTotal} từ, đạt ${pct} phần trăm`}>
            <text x="48" y="46" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text-primary)">
              {pct}%
            </text>
            <text x="48" y="62" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">
              {vocabMastered}/{vocabTotal}
            </text>
          </DonutRing>
          <div className="leading-tight">
            <b className="block text-[22px] tracking-tight">{vocabMastered} / {vocabTotal} từ đã nhớ</b>
            <span className="text-[12.5px] text-text-secondary">Từ vựng đã lưu vào SRS · học xong sẽ tự cập nhật</span>
          </div>
        </div>
        <div className="mt-2 border-t border-border-default">
          {[
            ["Từ vựng đã nhớ", `${vocabMastered} / ${vocabTotal} · ${pct}%`],
            ["Bài học", `${s.lessonsDone} / ${s.lessonsTotal} xong`],
            ["Ôn tập SRS", `${s.recallPct}% ghi nhớ`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-border-default py-2.5 text-[13px] last:border-b-0">
              <span className="text-text-secondary">{k}</span>
              <b className="tabular-nums">{v}</b>
            </div>
          ))}
        </div>
        <Link
          href="/roadmap"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-bold text-action-primary hover:underline"
        >
          Xem toàn bộ lộ trình <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Card B — công cụ */}
      <div className="rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs">
        <h3 className="text-[14.5px] font-bold">Công cụ bổ trợ nhanh</h3>
        <p className="mb-4 mt-1.5 text-[13px] text-text-secondary">Mở trong 1 chạm · tự lưu tiến độ</p>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {TOOLS.map(({ href, name, zh, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[76px] items-start gap-3 rounded-control border border-border-default bg-surface-muted p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-elevated hover:shadow-md"
            >
              <IconTile className="bg-surface-elevated">
                <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </IconTile>
              <span className="min-w-0">
                <b className="block text-[13.5px] leading-snug">
                  {name} {zh && <span className="zh">{zh}</span>}
                </b>
                <small className="mt-0.5 block text-xs leading-snug text-text-secondary">{desc}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
