/* /pinyin/bang-am — Bảng Pinyin 405 âm tiết (spec 2026-10-28). SSG server
   component; tương tác trong SyllableTable. Vai trò: TRA (đối chiếu Lab = HỌC).
   Deep-link ?sy=<base> do SyllableTable tự đọc. */
import type { Metadata } from "next";
import Link from "next/link";
import { SyllableTable } from "@/components/pinyin/table/syllable-table";

export const metadata: Metadata = {
  title: "Bảng Pinyin · 405 âm tiết",
  description:
    "Bảng Pinyin đầy đủ 405 âm tiết chuẩn tiếng Trung — bấm vào bất kỳ âm để nghe phát âm 4 thanh điệu và ví dụ thực tế.",
};

export default function BangAmPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">拼音表</span> · Bảng Pinyin · 405 âm tiết
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Tra cứu nhanh — bấm ô bất kỳ để xem chi tiết và nghe phát âm. Muốn luyện phản xạ, dùng{" "}
          <Link href="/pinyin" className="underline">Pinyin Lab</Link>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/pinyin?mode=quiz"
            className="inline-flex min-h-[44px] items-center rounded-control border border-action-primary bg-action-primary px-4 py-2 text-sm font-bold text-white shadow-xs transition-colors hover:bg-action-primary-hover"
          >
            Luyện phản xạ tai
          </Link>
          <Link
            href="/roadmap/pinyin"
            className="inline-flex min-h-[44px] items-center rounded-control border border-border-subtle bg-surface-elevated px-4 py-2 text-sm font-bold text-text-primary shadow-xs transition-colors hover:bg-surface-muted"
          >
            Học lộ trình
          </Link>
        </div>
      </header>
      <SyllableTable />
    </div>
  );
}
