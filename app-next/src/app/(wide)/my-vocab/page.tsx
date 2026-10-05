import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { NotebookList } from "@/components/notebook/notebook-list";
import { notebookSubGate } from "@/content/notebooks";
export const metadata: Metadata = { title: "Sổ tay từ vựng" };
export default function MyVocabPage() {
  return (
    <LoginGate pageSub={notebookSubGate.vocab}>
      <NotebookList kind="vocab" />
    </LoginGate>
  );
}
