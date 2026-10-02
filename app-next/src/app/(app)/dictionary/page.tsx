/* /dictionary (G1) — Tra từ điển Trung → Việt.
   Server component; search + vẽ chữ (DrawModal) trong DictionaryClient (useSearchParams cần Suspense). */
import { Suspense } from "react";
import type { Metadata } from "next";
import DictionaryClient from "./dictionary-client";

export const metadata: Metadata = {
  title: "Tra từ điển",
  description: "Tra nghĩa tiếng Việt của từ tiếng Trung bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt.",
};

export default function DictionaryPage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Tra từ điển</h1>
      <p className="text-sm font-semibold text-text-secondary mt-1">词典 — Trung → Việt</p>
      <div className="mt-5">
        <Suspense>
          <DictionaryClient />
        </Suspense>
      </div>
    </div>
  );
}
