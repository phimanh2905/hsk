/* /radicals (D3) — 214 Bộ Thủ: deck flashcard + grid theo số nét + autoplay + quy tắc nét.
   Server SSG; tương tác (deck, grid, autoplay, TTS) trong RadicalsClient. */

import Link from "next/link";
import RadicalsClient from "@/components/radicals/deck-client";
import StrokeRules from "@/components/radicals/stroke-rules";

export const metadata = {
  title: "214 Bộ Thủ",
  description: "214 Bộ Thủ Hán tự — deck flashcard, tra theo số nét, autoplay và quy tắc viết chữ.",
};

export default function RadicalsPage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">214 Bộ Thủ</h1>
      <p className="text-sm font-semibold text-nhai-muted mt-1">部首 — nền móng để nhớ mặt chữ Hán</p>
      <p className="text-sm text-nhai-muted mt-1">
        214 bộ thủ — phân loại theo số nét, bấm thẻ để nghe âm đọc
      </p>

      <div className="flex gap-2 mt-4 mb-6">
        <Link href="/create-file?tpl=radicals" className="btn-ghost px-3 py-1.5 text-sm font-bold">
          Tạo file luyện viết (214 bộ)
        </Link>
      </div>

      <RadicalsClient />
      <StrokeRules />
    </div>
  );
}
