/* /pinyin (D1) — Bảng Pinyin: ma trận thanh mẫu × vận mẫu.
   Server SSG; tương tác (filter, dialog, TTS) trong MatrixClient. */

import Link from "next/link";
import MatrixClient from "@/components/pinyin/matrix-client";

export const metadata = {
  title: "Bảng Pinyin",
  description: "Bảng Pinyin 406 âm tiết chuẩn — thanh mẫu × vận mẫu, bấm ô bất kỳ để xem chi tiết và nghe phát âm.",
};

export default function PinyinPage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Bảng Pinyin</h1>
      <p className="text-sm font-semibold text-text-secondary mt-1">
        拼音表 — Thanh mẫu (声母) × Vận mẫu (韵母)
      </p>
      <p className="text-sm text-text-secondary mt-1">
        406 âm tiết chuẩn — bấm ô bất kỳ để xem chi tiết và nghe phát âm
      </p>

      <div className="flex gap-2 mt-4 mb-6">
        <Link
          href="/roadmap/pinyin"
          className="inline-flex items-center min-h-11 rounded-control border border-border-default bg-surface-elevated px-3 py-1.5 text-sm font-bold text-text-primary hover:border-action-primary hover:text-action-primary"
        >
          Học theo lộ trình
        </Link>
        <Link
          href="/pinyin/practice"
          className="inline-flex items-center min-h-11 rounded-control border border-transparent bg-action-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-action-primary-hover active:bg-action-primary-active"
        >
          Bài tập
        </Link>
      </div>

      <MatrixClient />
    </div>
  );
}
