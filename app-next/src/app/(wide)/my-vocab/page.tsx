/* /my-vocab — Sổ tay từ vựng (port opendesign_hsk/my-vocab.html, spec 2026-10-05).
   LoginGate giữ nguyên (e2e gate test); data thật trong MyVocabRoot. */

import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import MyVocabRoot from "@/components/my-vocab/my-vocab-root";

export const metadata: Metadata = { title: "Sổ tay từ vựng" };

export default function MyVocabPage() {
  return (
    <LoginGate pageSub={notebookSubGate.vocab}>
      <MyVocabRoot />
    </LoginGate>
  );
}
